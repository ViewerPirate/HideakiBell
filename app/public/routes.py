# --- Código modificado para: app/public/routes.py ---

from flask import Blueprint, render_template, request, jsonify, flash, redirect, url_for
from app.utils import get_db_connection, add_notification
from app import socketio
import json
from app.telegram_utils import send_telegram_message

# Cria o Blueprint para as rotas públicas
public_bp = Blueprint('public', __name__, template_folder='../../templates')


@public_bp.route('/')
def home():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Query complexa para buscar a arte e os dados dos artistas associados
    query = """
        SELECT 
            g.id, g.title, g.description, g.image_url, g.is_nsfw,
            g.lineart_artist_id, g.color_artist_id,
            u1.username AS lineart_artist_name,
            u1.social_links AS lineart_artist_socials,
            u2.username AS color_artist_name,
            u2.social_links AS color_artist_socials
        FROM 
            gallery g
        LEFT JOIN 
            users u1 ON g.lineart_artist_id = u1.id
        LEFT JOIN 
            users u2 ON g.color_artist_id = u2.id
        ORDER BY 
            g.created_at DESC
    """
    cursor.execute(query)
    arts_db = cursor.fetchall()
    cursor.close()
    conn.close()

    # Processa os resultados para converter o JSON das redes sociais em listas
    arts = []
    for row in arts_db:
        art = dict(row)
        try:
            art['lineart_artist_socials'] = json.loads(art['lineart_artist_socials']) if art['lineart_artist_socials'] else []
        except (json.JSONDecodeError, TypeError):
            art['lineart_artist_socials'] = []
        
        try:
            art['color_artist_socials'] = json.loads(art['color_artist_socials']) if art['color_artist_socials'] else []
        except (json.JSONDecodeError, TypeError):
            art['color_artist_socials'] = []
            
        arts.append(art)

    return render_template('index.html', arts=arts)


@public_bp.route('/artistas')
def artistas():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT key, value FROM settings')
    settings_db = cursor.fetchall()
    settings = {row['key']: row['value'] for row in settings_db}
    site_mode = settings.get('site_mode', 'individual')
    
    artists = []
    main_artist_profile = None

    if site_mode == 'studio':
        cursor.execute(
            'SELECT username, artist_avatar, artist_portfolio_description, artist_specialties, social_links, artist_bio FROM users WHERE is_admin = TRUE AND is_public_artist = TRUE'
        )
        artists_db = cursor.fetchall()
        
        for row in artists_db:
            artist_dict = dict(row)
            try:
                artist_dict['artist_specialties'] = json.loads(artist_dict['artist_specialties']) if artist_dict['artist_specialties'] else []
            except (json.JSONDecodeError, TypeError):
                artist_dict['artist_specialties'] = []

            try:
                artist_dict['social_links'] = json.loads(artist_dict['social_links']) if artist_dict['social_links'] else []
            except (json.JSONDecodeError, TypeError):
                artist_dict['social_links'] = []

            artists.append(artist_dict)
    else:
        # Se o modo for individual, redireciona para a página "Sobre" que é a correta.
        return redirect(url_for('public.sobre'))

    cursor.close()
    conn.close()
    
    return render_template('artistas.html', 
                           artists=artists, 
                           main_artist_profile=main_artist_profile,
                           settings=settings)

# --- INÍCIO DA MODIFICAÇÃO: Rota 'sobre' simplificada ---
@public_bp.route('/sobre')
def sobre():
    """ 
    Renderiza a página 'Sobre'. 
    Removemos toda a busca de dados daqui. A página agora depende 100% das 
    variáveis globais injetadas pelo context_processor em app/__init__.py,
    que já respeita a lógica do "modo do site".
    """
    return render_template('sobre.html')
# --- FIM DA MODIFICAÇÃO ---


@public_bp.route('/artista/<string:username>/comissoes')
def comissoes_artista(username):
    conn = get_db_connection()
    cursor = conn.cursor()
    is_postgres = hasattr(conn, 'cursor_factory')
    placeholder = '%s' if is_postgres else '?'

    # 1. Encontra o artista pelo nome de usuário
    query_artist = f'SELECT * FROM users WHERE username = {placeholder} AND is_public_artist = TRUE'
    cursor.execute(query_artist, (username,))
    artist = cursor.fetchone()

    # Se o artista não for encontrado, volta para a lista de artistas
    if not artist:
        flash('Artista não encontrado.', 'error')
        return redirect(url_for('public.artistas'))

    # 2. Busca os serviços ativos daquele artista na tabela 'artist_services'
    query_services = f'SELECT * FROM artist_services WHERE artist_id = {placeholder} AND is_active = TRUE ORDER BY price'
    cursor.execute(query_services, (artist['id'],))
    services_db = cursor.fetchall()
    
    # 3. Processa os dados dos serviços (converte o JSON de fases)
    services = []
    for row in services_db:
        service = dict(row)
        try:
            service['phases'] = json.loads(service['phases']) if service['phases'] else []
        except (json.JSONDecodeError, TypeError):
            service['phases'] = []
        services.append(service)

    cursor.close()
    conn.close()

    # 4. Renderiza um novo template com os dados do artista e seus serviços
    return render_template('comissoes_artista.html', artist=artist, services=services)


@public_bp.route('/contato')
def contato():
    return render_template('contato.html')


@public_bp.route('/api/contact', methods=['POST'])
def handle_contact_form():
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    message = data.get('message')

    if not name or not email or not message:
        return jsonify({'success': False, 'message': 'Todos os campos são obrigatórios.'}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        is_postgres = hasattr(conn, 'cursor_factory')
        placeholder = '%s' if is_postgres else '?'
        
        query_insert = f'INSERT INTO contact_messages (sender_name, sender_email, message_content) VALUES ({placeholder}, {placeholder}, {placeholder})'
        cursor.execute(query_insert, (name, email, message))
        
        keys_to_fetch = ['TELEGRAM_ENABLED', 'TELEGRAM_TEMPLATE_CONTACT']
        placeholders_settings = ','.join([placeholder] * len(keys_to_fetch))
        query_settings = f"SELECT key, value FROM settings WHERE key IN ({placeholders_settings})"
        cursor.execute(query_settings, tuple(keys_to_fetch))
        settings_db = cursor.fetchall()
        
        settings = {row['key']: row['value'] for row in settings_db}
        
        conn.commit()
        cursor.close()
        conn.close()
        
        notification_message = f"Nova mensagem de contato de {name}."
        add_notification(notification_message)
        socketio.emit('new_message', {
            'message_for_admin': notification_message
        })

        if settings.get('TELEGRAM_ENABLED') == 'true':
            template = settings.get('TELEGRAM_TEMPLATE_CONTACT')
            if template:
                message_body = template.format(name=name, email=email, message=message)
                send_telegram_message(message_body)
        
        return jsonify({'success': True, 'message': 'Mensagem enviada com sucesso! Entraremos em contato em breve.'})
    
    except Exception as e:
        print(f"Erro ao processar mensagem de contato: {e}")
        return jsonify({'success': False, 'message': 'Ocorreu um erro no servidor ao tentar enviar sua mensagem.'}), 500

@public_bp.route('/ping')
def ping():
    """Endpoint leve apenas para verificar se o servidor está no ar."""
    return jsonify({'status': 'ok'}), 200