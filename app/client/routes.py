# --- Código do arquivo modificado: app/client/routes.py ---

import sqlite3
import json
import time
import os
from datetime import datetime
from flask import Blueprint, render_template, request, redirect, url_for, flash, session, jsonify
from app import socketio
from app.utils import get_db_connection, add_event_to_log, login_required, add_notification

client_bp = Blueprint('client', __name__, template_folder='../../templates')

# --- Funções Auxiliares (Novas) ---
def get_artist_names_by_ids(conn, artist_ids):
    if not artist_ids:
        return "artista indefinido"
    
    is_postgres = hasattr(conn, 'cursor_factory')
    placeholder_template = '%s' if is_postgres else '?'
    
    placeholders = ','.join([placeholder_template] * len(artist_ids))
    query = f"SELECT username FROM users WHERE id IN ({placeholders})"
    
    cursor = conn.cursor()
    cursor.execute(query, tuple(artist_ids))
    artists = cursor.fetchall()
    cursor.close()
    
    if not artists:
        return "artista desconhecido"
    
    return ', '.join(row['username'] for row in artists)

# --- Área do Cliente ---
@client_bp.route('/dashboard')
@login_required
def client_dashboard():
    if session.get('is_admin'):
        flash('Admins devem usar o painel de administração.', 'info')
        return redirect(url_for('admin.admin_dashboard'))
    return render_template('client/dashboard.html')


@client_bp.route('/minha-conta')
@login_required
def minha_conta():
    """Renderiza a página de configurações da conta do cliente."""
    return render_template('client/minha_conta.html')


@client_bp.route('/ajuda')
@login_required
def ajuda_suporte():
    """Renderiza a página de ajuda e suporte (FAQ)."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT question, answer FROM faqs ORDER BY display_order, id')
    faqs_db = cursor.fetchall()
    faqs = [dict(row) for row in faqs_db]
    
    cursor.execute("SELECT value FROM settings WHERE key = 'support_contacts'")
    contacts_setting = cursor.fetchone()
    support_contacts = []
    
    if contacts_setting and contacts_setting['value']:
        try:
            support_contacts = json.loads(contacts_setting['value'])
        except json.JSONDecodeError:
            support_contacts = []

    cursor.close()
    conn.close()
    
    return render_template('client/ajuda_suporte.html', faqs=faqs, support_contacts=support_contacts)


# --- API do Cliente ---

@client_bp.route('/api/client/artists')
@login_required
def get_public_artists():
    """Busca e retorna todos os administradores que estão marcados como artistas públicos."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        'SELECT id, username, artist_avatar, artist_specialties, artist_portfolio_description, social_links FROM users WHERE is_admin = TRUE AND is_public_artist = TRUE'
    )
    artists_db = cursor.fetchall()
    cursor.close()
    conn.close()
    
    artists_list = []
    for row in artists_db:
        artist_dict = dict(row)
        try:
            artist_dict['artist_specialties'] = json.loads(artist_dict['artist_specialties']) if artist_dict['artist_specialties'] else []
        except json.JSONDecodeError:
            artist_dict['artist_specialties'] = []

        try:
            artist_dict['social_links'] = json.loads(artist_dict['social_links']) if artist_dict['social_links'] else []
        except (json.JSONDecodeError, TypeError):
            artist_dict['social_links'] = []
            
        artists_list.append(artist_dict)
        
    return jsonify(artists_list)

@client_bp.route('/api/client/artists/<int:artist_id>/portfolio')
@login_required
def get_artist_portfolio(artist_id):
    """Busca e retorna as obras da galeria de um artista específico."""
    conn = get_db_connection()
    cursor = conn.cursor()
    is_postgres = hasattr(conn, 'cursor_factory')
    placeholder = '%s' if is_postgres else '?'
    
    query = f"SELECT id, title, image_url as image, description, 'fanart' as type, {placeholder} as artist_id FROM gallery WHERE lineart_artist_id = {placeholder} OR color_artist_id = {placeholder} ORDER BY created_at DESC"
    cursor.execute(query, (artist_id, artist_id, artist_id))
    arts_db = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify([dict(row) for row in arts_db])

@client_bp.route('/api/client/artist_services/<int:artist_id>')
@login_required
def get_artist_services(artist_id):
    """Busca e retorna os serviços de um artista específico."""
    conn = get_db_connection()
    cursor = conn.cursor()
    is_postgres = hasattr(conn, 'cursor_factory')
    placeholder = '%s' if is_postgres else '?'
    
    query = f"SELECT * FROM artist_services WHERE artist_id = {placeholder} AND is_active = TRUE"
    cursor.execute(query, (artist_id,))
    services_db = cursor.fetchall()
    cursor.close()
    conn.close()

    services_list = []
    for row in services_db:
        service_dict = dict(row)
        try:
            service_dict['phases'] = json.loads(service_dict['phases']) if service_dict['phases'] else []
        except (json.JSONDecodeError, TypeError):
            service_dict['phases'] = []
        services_list.append(service_dict)

    return jsonify(services_list)

@client_bp.route('/api/client/pricing')
@login_required
def client_get_pricing():
    conn = get_db_connection()
    cursor = conn.cursor()
    is_postgres = hasattr(conn, 'cursor_factory')
    placeholder = '%s' if is_postgres else '?'
    
    keys_to_fetch = [
        'commission_types', 'commission_extras', 'refund_policy', 'default_phases', 
        'revision_alert_text', 'pix_key', 'paypal_email', 'payment_currency_code', 
        'paypal_hosted_button_id', 'support_contacts', 'social_links', 'site_mode'
    ]
    placeholders = ','.join([placeholder] * len(keys_to_fetch))
    query = f'SELECT key, value FROM settings WHERE key IN ({placeholders})'
    cursor.execute(query, tuple(keys_to_fetch))
    settings_db = cursor.fetchall()
    settings = {row['key']: row['value'] for row in settings_db}

    final_social_links = []
    site_mode = settings.get('site_mode', 'individual')
    
    if site_mode == 'individual':
        cursor.execute('SELECT social_links FROM users WHERE is_admin = TRUE ORDER BY id ASC LIMIT 1')
        main_artist = cursor.fetchone()
        links_json_str = main_artist['social_links'] if main_artist and main_artist['social_links'] else settings.get('social_links', '[]')
    else:
        links_json_str = settings.get('social_links', '[]')

    try:
        final_social_links = json.loads(links_json_str) if links_json_str else []
    except (json.JSONDecodeError, TypeError):
        final_social_links = []
        
    cursor.execute(f"SELECT value FROM plugin_data WHERE user_id = (SELECT id FROM users WHERE is_admin = TRUE ORDER BY id ASC LIMIT 1) AND key = 'public_additional_contacts'")
    plugin_data_row = cursor.fetchone()
    if plugin_data_row and plugin_data_row['value']:
        try:
            additional_contacts = json.loads(plugin_data_row['value'])
            if isinstance(additional_contacts, list):
                final_social_links.extend(additional_contacts)
        except (json.JSONDecodeError, TypeError):
            pass

    response_data = {
        'commission_types': json.loads(settings.get('commission_types', '[]')),
        'commission_extras': json.loads(settings.get('commission_extras', '[]')),
        'refund_policy': settings.get('refund_policy', 'Política de reembolso não definida.'),
        'revision_alert_text': settings.get('revision_alert_text', 'Você possui <strong>{revisions_left} de {revisions_limit}</strong> restantes para esta fase.'),
        'pix_key': settings.get('pix_key'),
        'paypal_email': settings.get('paypal_email'),
        'payment_currency_code': settings.get('payment_currency_code'),
        'paypal_hosted_button_id': settings.get('paypal_hosted_button_id'),
        'support_contacts': json.loads(settings.get('support_contacts', '[]')),
        'social_links': final_social_links
    }
    
    cursor.close()
    conn.close()
    
    return jsonify(response_data)


@client_bp.route('/api/client/orders')
@login_required
def client_get_orders():
    user_id = session.get('user_id')
    conn = get_db_connection()
    cursor = conn.cursor()
    is_postgres = hasattr(conn, 'cursor_factory')
    placeholder = '%s' if is_postgres else '?'
    
    query = f'SELECT * FROM comissoes WHERE client_id = {placeholder} ORDER BY date DESC'
    cursor.execute(query, (user_id,))
    orders_db = cursor.fetchall()
    cursor.close()
    conn.close()
    
    orders_list = [dict(row) for row in orders_db]
    for order in orders_list:
        for key in ['comments', 'reference_files', 'preview', 'phases', 'event_log', 'assigned_artist_ids']:
            order[key] = json.loads(order[key]) if (order[key] and order[key] != '[]') else []
    return jsonify(orders_list)


@client_bp.route('/api/client/commissions', methods=['POST'])
@login_required
def client_create_commission():
    data = request.get_json()
    user_id = session.get('user_id')
    username = session.get('username')
    
    if not all(k in data for k in ['title', 'type', 'description', 'price', 'assigned_artist_ids']):
        return jsonify({'success': False, 'message': 'Dados incompletos. A seleção do artista é obrigatória.'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    is_postgres = hasattr(conn, 'cursor_factory')
    placeholder = '%s' if is_postgres else '?'

    try:
        cursor.execute("SELECT value FROM settings WHERE key = 'commission_types'")
        settings_db = cursor.fetchone()
        all_types = json.loads(settings_db['value']) if settings_db else []
        selected_type_config = next((t for t in all_types if t['name'] == data.get('type')), None)
        commission_phases = selected_type_config.get('phases', []) if selected_type_config else []
        
        if not commission_phases:
            cursor.execute("SELECT value FROM settings WHERE key = 'default_phases'")
            default_phases_str = cursor.fetchone()
            commission_phases = json.loads(default_phases_str['value']) if default_phases_str else []
            
        new_id = f"ART-{int(time.time())}"
        today = datetime.now().strftime('%Y-%m-%d')
        initial_event = [{"timestamp": datetime.now().isoformat(), "actor": "Cliente", "message": "Pedido criado. Aguardando pagamento."}]
        
        query_insert = f"""
            INSERT INTO comissoes (id, client, type, date, deadline, price, 
            status, description, preview, comments, 
            client_id, phases, current_phase_index, revisions_used, event_log, payment_status, assigned_artist_ids) 
            VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder})
        """
        cursor.execute(query_insert, (new_id, username, data.get('type'), today, data.get('deadline'), data.get('price'), 'pending_payment', data.get('description'), '[]', '[]', user_id, json.dumps(commission_phases), 0, 0, json.dumps(initial_event), 'unpaid', json.dumps(data.get('assigned_artist_ids'))))
        conn.commit()

        artist_names = get_artist_names_by_ids(conn, data.get('assigned_artist_ids'))
        notification_message = f"Novo pedido #{new_id} de {username} para {artist_names} aguardando pagamento."
        add_notification(notification_message, new_id)
        
        socketio.emit('commission_updated', {'commission_id': new_id, 'message_for_admin': notification_message})
        
        return jsonify({'success': True, 'message': 'Pedido enviado com sucesso!', 'id': new_id})
    except Exception as e:
        print(f"Erro inesperado: {e}")
        return jsonify({'success': False, 'message': f'Erro inesperado: {e}'}), 500
    finally:
        cursor.close()
        conn.close()

@client_bp.route('/api/client/orders/<string:order_id>/comment', methods=['POST'])
@login_required
def client_add_comment(order_id):
    data = request.get_json()
    user_id = session.get('user_id')
    username = session.get('username')
    conn = get_db_connection()
    cursor = conn.cursor()
    is_postgres = hasattr(conn, 'cursor_factory')
    placeholder = '%s' if is_postgres else '?'
    
    query_select = f'SELECT * FROM comissoes WHERE id = {placeholder} AND client_id = {placeholder}'
    cursor.execute(query_select, (order_id, user_id))
    order = cursor.fetchone()

    if not order:
        cursor.close()
        conn.close()
        return jsonify({'success': False, 'message': 'Pedido não encontrado.'}), 404
    
    comments = json.loads(order['comments']) if order['comments'] else []
    new_comment = {"author": username, "is_artist": False, "date": datetime.now().isoformat(), "text": data.get('text')}
    comments.append(new_comment)
    
    query_update = f'UPDATE comissoes SET comments = {placeholder} WHERE id = {placeholder}'
    cursor.execute(query_update, (json.dumps(comments), order_id))
    add_event_to_log(conn, order_id, "Cliente", "Adicionou um novo comentário.")
    conn.commit()
    
    socketio.emit('commission_updated', {'commission_id': order_id, 'message_for_admin': f"Novo comentário de {username} no pedido #{order_id}."})
    
    cursor.close()
    conn.close()
    add_notification(f"Novo comentário de {username} no pedido #{order_id}", order_id)
    return jsonify({'success': True, 'comment': new_comment})


@client_bp.route('/api/client/orders/<string:order_id>/request_revision', methods=['POST'])
@login_required
def request_revision(order_id):
    data = request.get_json()
    comment_text = data.get('comment')
    if not comment_text:
        return jsonify({'success': False, 'message': 'O comentário de revisão é obrigatório.'}), 400
        
    user_id = session.get('user_id')
    username = session.get('username')
    conn = get_db_connection()
    cursor = conn.cursor()
    is_postgres = hasattr(conn, 'cursor_factory')
    placeholder = '%s' if is_postgres else '?'
    
    query_select = f'SELECT * FROM comissoes WHERE id = {placeholder} AND client_id = {placeholder}'
    cursor.execute(query_select, (order_id, user_id))
    order = cursor.fetchone()
    
    if not order:
        cursor.close()
        conn.close()
        return jsonify({'success': False, 'message': 'Acesso negado.'}), 403
        
    phases = json.loads(order['phases'])
    current_phase_index = order['current_phase_index']
    revisions_used = order['revisions_used']
    current_phase = phases[current_phase_index]
    if revisions_used >= current_phase['revisions_limit']:
        cursor.close()
        conn.close()
        return jsonify({'success': False, 'message': 'Limite de revisões para esta fase atingido.'}), 403
        
    revisions_used += 1
    comments = json.loads(order['comments']) if order['comments'] else []
    revision_comment = {
        "author": username, "is_artist": False, "date": datetime.now().isoformat(),
        "text": comment_text, "is_revision_request": True, "phase_name": current_phase['name']
    }
    comments.append(revision_comment)
    
    query_update = f'UPDATE comissoes SET status = {placeholder}, revisions_used = {placeholder}, comments = {placeholder} WHERE id = {placeholder}'
    cursor.execute(query_update, ('revisions', revisions_used, json.dumps(comments), order_id))
    add_event_to_log(conn, order_id, "Cliente", f"Solicitou uma revisão para a fase '{current_phase['name']}'.")
    conn.commit()
    
    socketio.emit('commission_updated', {'commission_id': order_id, 'message_for_admin': f"{username} pediu revisão para a fase '{current_phase['name']}' do pedido #{order_id}."})
    
    cursor.close()
    conn.close()
    add_notification(f"Cliente solicitou revisão para a fase '{current_phase['name']}' do pedido #{order_id}", order_id)
    return jsonify({'success': True, 'message': 'Pedido de revisão enviado.', 'comment': revision_comment})


@client_bp.route('/api/client/orders/<string:order_id>/approve_phase', methods=['POST'])
@login_required
def approve_phase(order_id):
    user_id = session.get('user_id')
    username = session.get('username')
    conn = get_db_connection()
    cursor = conn.cursor()
    is_postgres = hasattr(conn, 'cursor_factory')
    placeholder = '%s' if is_postgres else '?'
    
    query_select = f'SELECT * FROM comissoes WHERE id = {placeholder} AND client_id = {placeholder}'
    cursor.execute(query_select, (order_id, user_id))
    order = cursor.fetchone()

    if not order:
        cursor.close()
        conn.close()
        return jsonify({'success': False, 'message': 'Acesso negado.'}), 403
    
    phases = json.loads(order['phases']) if order['phases'] else []
    current_phase_index = order['current_phase_index']

    if not phases or current_phase_index >= len(phases):
        cursor.close()
        conn.close()
        return jsonify({'success': False, 'message': 'Erro ao processar fases do pedido.'}), 400

    current_phase_name = phases[current_phase_index]['name']
    next_phase_index = current_phase_index + 1
    
    add_event_to_log(conn, order_id, "Cliente", f"Aprovou a fase '{current_phase_name}'.")
    
    if next_phase_index >= len(phases):
        query_update = f'UPDATE comissoes SET status = {placeholder}, current_phase_index = {placeholder} WHERE id = {placeholder}'
        cursor.execute(query_update, ('completed', next_phase_index, order_id))
        add_event_to_log(conn, order_id, "Sistema", "Todas as fases foram aprovadas. Pedido finalizado.")
    else:
        next_phase_name = phases[next_phase_index]['name']
        query_update = f'UPDATE comissoes SET status = {placeholder}, current_phase_index = {placeholder}, revisions_used = 0 WHERE id = {placeholder}'
        cursor.execute(query_update, ('in_progress', next_phase_index, order_id))
        add_event_to_log(conn, order_id, "Sistema", f"Projeto avançou para a fase '{next_phase_name}'.")
    
    conn.commit()
    
    cursor.close()
    conn.close()
    
    return jsonify({'success': True, 'message': 'Fase aprovada com sucesso.'})


@client_bp.route('/api/client/orders/<string:order_id>/payment_confirmed_by_client', methods=['POST'])
@login_required
def client_confirm_payment(order_id):
    user_id = session.get('user_id')
    username = session.get('username')
    conn = get_db_connection()
    cursor = conn.cursor()
    is_postgres = hasattr(conn, 'cursor_factory')
    placeholder = '%s' if is_postgres else '?'

    query_select = f'SELECT * FROM comissoes WHERE id = {placeholder} AND client_id = {placeholder}'
    cursor.execute(query_select, (order_id, user_id))
    if not cursor.fetchone():
        cursor.close()
        conn.close()
        return jsonify({'success': False, 'message': 'Pedido não encontrado.'}), 404

    query_update = f"UPDATE comissoes SET payment_status = 'awaiting_confirmation' WHERE id = {placeholder}"
    cursor.execute(query_update, (order_id,))
    add_event_to_log(conn, order_id, "Cliente", "Confirmou que efetuou o pagamento.")
    conn.commit()
    
    socketio.emit('commission_updated', {'commission_id': order_id, 'message_for_admin': f"{username} confirmou o pagamento do pedido #{order_id}. Por favor, verifique."})
    
    cursor.close()
    conn.close()
    
    add_notification(f"O cliente {username} confirmou o pagamento para o pedido #{order_id}. Por favor, verifique.", order_id)
    
    return jsonify({'success': True, 'message': 'Confirmação de pagamento enviada ao artista.'})


@client_bp.route('/api/client/orders/<string:order_id>/cancel', methods=['POST'])
@login_required
def cancel_order(order_id):
    user_id = session.get('user_id')
    username = session.get('username')
    conn = get_db_connection()
    cursor = conn.cursor()
    is_postgres = hasattr(conn, 'cursor_factory')
    placeholder = '%s' if is_postgres else '?'
    
    try:
        query_select = f'SELECT status FROM comissoes WHERE id = {placeholder} AND client_id = {placeholder}'
        cursor.execute(query_select, (order_id, user_id))
        order = cursor.fetchone()
        
        if not order:
            return jsonify({'success': False, 'message': 'Pedido não encontrado ou acesso negado.'}), 404

        if order['status'] in ['completed', 'cancelled']:
            return jsonify({'success': False, 'message': f'Este pedido já está com o status "{order["status"]}" e não pode ser cancelado.'}), 400

        query_update = f"UPDATE comissoes SET status = 'cancelled' WHERE id = {placeholder}"
        cursor.execute(query_update, (order_id,))
        add_event_to_log(conn, order_id, "Cliente", "Pedido cancelado pelo cliente.")
        conn.commit()
        
        socketio.emit('commission_updated', {'commission_id': order_id, 'message_for_admin': f"O cliente {username} cancelou o pedido #{order_id}."})
        add_notification(f"O cliente {username} cancelou o pedido #{order_id}.", order_id)
    
        return jsonify({'success': True, 'message': 'Pedido cancelado com sucesso.'})

    except Exception as e:
        print(f"Erro de banco de dados ao cancelar pedido: {e}")
        return jsonify({'success': False, 'message': 'Erro no servidor ao tentar cancelar o pedido.'}), 500
    finally:
        if conn:
            cursor.close()
            conn.close()

# --- Rotas de API para Notificações do Cliente ---

@client_bp.route('/api/client/notifications/unread_count', methods=['GET'])
@login_required
def get_client_unread_count():
    user_id = session.get('user_id')
    conn = get_db_connection()
    cursor = conn.cursor()
    is_postgres = hasattr(conn, 'cursor_factory')
    placeholder = '%s' if is_postgres else '?'
    
    query = f'SELECT COUNT(id) as count FROM notifications WHERE is_read = 0 AND user_id = {placeholder}'
    cursor.execute(query, (user_id,))
    count = cursor.fetchone()['count']
    
    cursor.close()
    conn.close()
    return jsonify({'count': count})

@client_bp.route('/api/client/notifications', methods=['GET'])
@login_required
def get_client_all_notifications():
    user_id = session.get('user_id')
    conn = get_db_connection()
    cursor = conn.cursor()
    is_postgres = hasattr(conn, 'cursor_factory')
    placeholder = '%s' if is_postgres else '?'
    
    query = f'SELECT * FROM notifications WHERE user_id = {placeholder} ORDER BY timestamp DESC LIMIT 20'
    cursor.execute(query, (user_id,))
    notifications = cursor.fetchall()
    
    cursor.close()
    conn.close()
    return jsonify([dict(row) for row in notifications])

@client_bp.route('/api/client/notifications/mark_read', methods=['POST'])
@login_required
def mark_client_notifications_as_read():
    user_id = session.get('user_id')
    conn = get_db_connection()
    cursor = conn.cursor()
    is_postgres = hasattr(conn, 'cursor_factory')
    placeholder = '%s' if is_postgres else '?'
    
    query = f'UPDATE notifications SET is_read = 1 WHERE is_read = 0 AND user_id = {placeholder}'
    cursor.execute(query, (user_id,))
    conn.commit()
    
    cursor.close()
    conn.close()
    return jsonify({'success': True})

@client_bp.route('/api/client/notifications/mark_read/commission/<string:commission_id>', methods=['POST'])
@login_required
def mark_commission_notifications_as_read(commission_id):
    user_id = session.get('user_id')
    conn = get_db_connection()
    cursor = conn.cursor()
    is_postgres = hasattr(conn, 'cursor_factory')
    placeholder = '%s' if is_postgres else '?'
    
    try:
        query = f'UPDATE notifications SET is_read = 1 WHERE user_id = {placeholder} AND related_commission_id = {placeholder} AND is_read = 0'
        cursor.execute(query, (user_id, commission_id))
        conn.commit()
        
        return jsonify({'success': True, 'message': 'Notificações da comissão marcadas como lidas.'})
    except Exception as e:
        print(f"Erro de banco de dados ao marcar nots da comissão como lidas: {e}")
        return jsonify({'success': False, 'message': 'Erro no servidor.'}), 500
    finally:
        cursor.close()
        conn.close()

from . import api_account_routes

# --- INÍCIO DA MODIFICAÇÃO: Nova rota para buscar configurações do artista ---
@client_bp.route('/api/client/artist_settings/<int:artist_id>')
@login_required
def get_artist_settings(artist_id):
    """
    Busca todas as configurações públicas de um artista, incluindo serviços e pagamentos.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    is_postgres = hasattr(conn, 'cursor_factory')
    placeholder = '%s' if is_postgres else '?'
    
    try:
        # 1. Buscar os serviços do artista
        query_services = f"SELECT * FROM artist_services WHERE artist_id = {placeholder} AND is_active = TRUE"
        cursor.execute(query_services, (artist_id,))
        services_db = cursor.fetchall()
        
        services_list = []
        for row in services_db:
            service = dict(row)
            try:
                service['phases'] = json.loads(service['phases']) if service['phases'] else []
            except (json.JSONDecodeError, TypeError):
                service['phases'] = []
            services_list.append(service)

        # 2. Buscar as configurações adicionais (pagamentos, etc.)
        query_settings = f"SELECT value FROM plugin_data WHERE plugin_id = 'artist_profile_settings' AND key = 'all_settings' AND user_id = {placeholder}"
        cursor.execute(query_settings, (artist_id,))
        settings_row = cursor.fetchone()

        artist_settings = {}
        if settings_row and settings_row['value']:
            try:
                artist_settings = json.loads(settings_row['value'])
            except (json.JSONDecodeError, TypeError):
                artist_settings = {}

        # 3. Montar a resposta final
        response_data = {
            'services': services_list,
            'settings': artist_settings
        }
        
        return jsonify(response_data)

    except Exception as e:
        print(f"Erro ao buscar configurações do artista {artist_id}: {e}")
        return jsonify({'success': False, 'message': 'Erro no servidor.'}), 500
    finally:
        cursor.close()
        conn.close()
# --- FIM DA MODIFICAÇÃO ---