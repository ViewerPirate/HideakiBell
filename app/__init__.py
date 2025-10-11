import json
import os 
import urllib3
from flask import Flask, session
from flask_socketio import SocketIO
from .utils import get_db_connection
from .db_setup import initialize_database

# Cria a instância do SocketIO globalmente
socketio = SocketIO()

def create_app():
    """Cria e configura uma instância da aplicação Flask."""
    
    app = Flask(__name__, 
                instance_relative_config=True, 
                static_url_path='/static', 
                static_folder='../static', 
                template_folder='../templates')
    
    app.secret_key = 'sua_chave_secreta_super_aleatoria_aqui'

    # === INÍCIO DA CORREÇÃO PARA URLLIB3/EVENTLET/SSL NO PYTHON RECENTE ===
    if hasattr(urllib3.util.ssl_, 'DEFAULT_CIPHERS'):
        urllib3.util.ssl_.DEFAULT_CIPHERS += ':HIGH:!DH!aNULL'
    if hasattr(urllib3.util.ssl_, 'minimum_version'):
        del urllib3.util.ssl_.minimum_version
    # === FIM DA CORREÇÃO ===

    with app.app_context():
        initialize_database()

    socketio.init_app(app)

    # Importa e registra os Blueprints
    from .auth.routes import auth_bp
    from .public.routes import public_bp
    from .client.routes import client_bp
    from .admin.routes import admin_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(public_bp)
    app.register_blueprint(client_bp)
    app.register_blueprint(admin_bp)

    # --- Injetor de Contexto Global ---
    @app.context_processor
    def inject_site_settings():
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute('SELECT key, value FROM settings')
            settings_db = cursor.fetchall()
            settings = {row['key']: row['value'] for row in settings_db}
 
            cursor.execute("SELECT id, code FROM plugins WHERE is_active = 1 AND scope = 'public'")
            public_plugins_db = cursor.fetchall()
            public_plugins = [dict(row) for row in public_plugins_db]

            admin_plugins = []
            if session.get('is_admin'):
                cursor.execute("SELECT id, code FROM plugins WHERE is_active = 1 AND scope = 'admin'")
                admin_plugins_db = cursor.fetchall()
                admin_plugins = [dict(row) for row in admin_plugins_db]
            
            site_mode = settings.get('site_mode', 'individual')
   
            if site_mode == 'studio':
                display_name = settings.get('studio_name', 'Nome do Estúdio')
            else:
                display_name = settings.get('artist_name', 'Nome Padrão')
           
            session_avatar_url = session.get('avatar_url', None)
          
            # --- LÓGICA DAS REDES SOCIAIS (BASE) ---
            social_links = []
            links_json_str = settings.get('social_links', '[]')
            
            if site_mode == 'individual':
                cursor.execute('SELECT social_links FROM users WHERE id = 1')
                main_artist = cursor.fetchone()
                if main_artist and main_artist['social_links']:
                    links_json_str = main_artist['social_links']

            try:
                social_links = json.loads(links_json_str) if links_json_str else []
            except json.JSONDecodeError:
                social_links = []

            # --- INÍCIO DA MODIFICAÇÃO GLOBAL ---
            # 1. Busca TODOS os dados de plugins marcados como públicos para o artista principal
            public_plugin_data = {}
            is_postgres = hasattr(conn, 'cursor_factory')
            placeholder = '%s' if is_postgres else '?'
            
            # A query agora busca por qualquer chave que comece com 'public_'
            query_plugin = f"SELECT key, value FROM plugin_data WHERE user_id = {placeholder} AND key LIKE 'public_%'"
            cursor.execute(query_plugin, (1,)) # ID 1 = Artista Principal
            plugin_data_rows = cursor.fetchall()
            
            for row in plugin_data_rows:
                # Remove o prefixo 'public_' para criar uma chave mais limpa
                clean_key = row['key'].replace('public_', '', 1)
                try:
                    public_plugin_data[clean_key] = json.loads(row['value'])
                except (json.JSONDecodeError, TypeError):
                    public_plugin_data[clean_key] = row['value']

            # 2. Lógica específica para unificar os contatos, se existirem
            additional_contacts = public_plugin_data.get('additional_contacts') # Procura pela chave limpa
            if additional_contacts and isinstance(additional_contacts, list):
                social_links.extend(additional_contacts)
            # --- FIM DA MODIFICAÇÃO GLOBAL ---

            cursor.close()
            conn.close()
 
            return dict(
                artist_name=display_name, 
                site_mode=site_mode,
                session_avatar_url=session_avatar_url,
                artist_email=settings.get('artist_email', 'contato@email.com'),
                artist_location=settings.get('artist_location', 'Localização Padrão'),
                artist_avatar=settings.get('artist_avatar', 'https://placehold.co/400x400'),
                artist_bio=settings.get('artist_bio', 'Biografia padrão.'),
                artist_process=settings.get('artist_process', 'Processo criativo padrão.'),
                artist_inspirations=settings.get('artist_inspirations', 'Inspirações padrão.'),
                home_headline=settings.get('home_headline', 'Bem-vindo à Galeria'),
                home_subheadline=settings.get('home_subheadline', 'Explore as obras.'),
                social_links=social_links,
                public_plugin_data=public_plugin_data, # Disponibiliza TODOS os dados públicos para os templates
                custom_css=settings.get('custom_css_theme', None),
                paypal_email=settings.get('paypal_email'),
                paypal_hosted_button_id=settings.get('paypal_hosted_button_id'),
                pix_key=settings.get('pix_key'),
                payment_currency_code=settings.get('payment_currency_code', 'BRL'),
                public_plugins=public_plugins,
                admin_plugins=admin_plugins
            )
        except Exception as e:
            print(f"Aviso: Não foi possível injetar configurações do site (pode ser o primeiro build): {e}")
            return {}

    return app