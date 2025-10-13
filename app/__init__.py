import json
import os 
import urllib3
from flask import Flask, session
from flask_socketio import SocketIO
from .utils import get_db_connection, get_icon_for_network
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

    if hasattr(urllib3.util.ssl_, 'DEFAULT_CIPHERS'):
        urllib3.util.ssl_.DEFAULT_CIPHERS += ':HIGH:!DH!aNULL'
    if hasattr(urllib3.util.ssl_, 'minimum_version'):
        del urllib3.util.ssl_.minimum_version

    with app.app_context():
        initialize_database()

    socketio.init_app(app)

    app.jinja_env.filters['social_icon'] = get_icon_for_network

    from .auth.routes import auth_bp
    from .public.routes import public_bp
    from .client.routes import client_bp
    from .admin.routes import admin_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(public_bp)
    app.register_blueprint(client_bp)
    app.register_blueprint(admin_bp)

    @app.context_processor
    def inject_site_settings():
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute('SELECT key, value FROM settings')
            settings_db = cursor.fetchall()
            settings = {row['key']: row['value'] for row in settings_db}

            cursor.execute('SELECT * FROM users WHERE is_admin = TRUE ORDER BY id ASC LIMIT 1')
            main_artist = cursor.fetchone()
            main_artist_profile = dict(main_artist) if main_artist else {}
            main_artist_id = main_artist['id'] if main_artist else None

            site_mode = settings.get('site_mode', 'individual')

            if site_mode == 'individual':
                display_name = main_artist_profile.get('username') or settings.get('artist_name')
                artist_avatar = main_artist_profile.get('artist_avatar') or settings.get('artist_avatar')
                artist_bio = main_artist_profile.get('artist_bio') or settings.get('artist_bio')
                links_json_str = main_artist_profile.get('social_links') or settings.get('social_links', '[]')
            else:
                display_name = settings.get('studio_name', 'Nome do Estúdio')
                artist_avatar = settings.get('artist_avatar')
                artist_bio = settings.get('artist_bio')
                links_json_str = settings.get('social_links', '[]')
            
            try:
                social_links = json.loads(links_json_str) if links_json_str else []
            except (json.JSONDecodeError, TypeError):
                social_links = []
            
            cursor.execute("SELECT id, code FROM plugins WHERE is_active = 1 AND scope = 'public'")
            public_plugins_db = cursor.fetchall()
            public_plugins = [dict(row) for row in public_plugins_db]

            admin_plugins = []
            if session.get('is_admin'):
                cursor.execute("SELECT id, code FROM plugins WHERE is_active = 1 AND scope = 'admin'")
                admin_plugins_db = cursor.fetchall()
                admin_plugins = [dict(row) for row in admin_plugins_db]
            
            public_plugin_data = {}
            if main_artist_id:
                is_postgres = hasattr(conn, 'cursor_factory')
                placeholder = '%s' if is_postgres else '?'
                query_plugin = f"SELECT key, value FROM plugin_data WHERE user_id = {placeholder} AND key LIKE {placeholder}"
                cursor.execute(query_plugin, (main_artist_id, 'public_%'))
                plugin_data_rows = cursor.fetchall()
                
                for row in plugin_data_rows:
                    clean_key = row['key'].replace('public_', '', 1)
                    try:
                        public_plugin_data[clean_key] = json.loads(row['value'])
                    except (json.JSONDecodeError, TypeError):
                        public_plugin_data[clean_key] = row['value']

            # --- INÍCIO DA MODIFICAÇÃO: Bloco de código do plugin removido ---
            # A lógica que buscava 'additional_contacts' e os adicionava a 'social_links' foi removida daqui.
            # --- FIM DA MODIFICAÇÃO ---

            cursor.close()
            conn.close()
 
            return dict(
                artist_name=display_name, artist_avatar=artist_avatar, artist_bio=artist_bio,
                social_links=social_links, site_mode=site_mode,
                session_avatar_url=session.get('avatar_url', None),
                artist_email=settings.get('artist_email', 'contato@email.com'),
                artist_location=settings.get('artist_location', 'Localização Padrão'),
                artist_process=settings.get('artist_process', 'Processo criativo padrão.'),
                artist_inspirations=settings.get('artist_inspirations', 'Inspirações padrão.'),
                home_headline=settings.get('home_headline', 'Bem-vindo à Galeria'),
                home_subheadline=settings.get('home_subheadline', 'Explore as obras.'),
                public_plugin_data=public_plugin_data, custom_css=settings.get('custom_css_theme', None),
                paypal_email=settings.get('paypal_email'), paypal_hosted_button_id=settings.get('paypal_hosted_button_id'),
                pix_key=settings.get('pix_key'), payment_currency_code=settings.get('payment_currency_code', 'BRL'),
                public_plugins=public_plugins, admin_plugins=admin_plugins
            )
        except Exception as e:
            print(f"Aviso: Não foi possível injetar configurações do site (pode ser o primeiro build): {e}")
            return {
                'artist_name': 'Site de Arte', 'site_mode': 'individual',
                'social_links': [], 'public_plugins': [], 'admin_plugins': []
            }

    return app