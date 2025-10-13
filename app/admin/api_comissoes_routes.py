# --- Código do arquivo modificado: app/admin/api_comissoes_routes.py ---

import json
import time
import os
from datetime import datetime
from flask import request, jsonify, session
from app import socketio
from app.utils import get_db_connection, add_event_to_log, admin_required, add_notification, translate_status

from .routes import admin_bp

@admin_bp.route('/api/comissoes', methods=['GET'])
@admin_required
def get_comissoes():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM comissoes ORDER BY date DESC')
    comissoes_db = cursor.fetchall()
    cursor.close()
    conn.close()
    
    comissoes_lista = [dict(row) for row in comissoes_db]
    for comissao in comissoes_lista:
        for key in ['comments', 'reference_files', 'preview', 'phases', 'event_log', 'assigned_artist_ids']:
            comissao[key] = json.loads(comissao[key]) if (comissao[key] and comissao[key] != '[]') else []
    return jsonify(comissoes_lista)

@admin_bp.route('/api/comissoes', methods=['POST'])
@admin_required
def create_comissao():
    data = request.get_json()
    new_id = f"ART-{int(time.time())}"
    today = datetime.now().strftime('%Y-%m-%d')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    is_postgres = hasattr(conn, 'cursor_factory')
    placeholder = '%s' if is_postgres else '?'

    try:
        cursor.execute("SELECT value FROM settings WHERE key = 'default_phases'")
        default_phases_str = cursor.fetchone()
        default_phases = json.loads(default_phases_str['value']) if default_phases_str else []
        
        initial_event = [{"timestamp": datetime.now().isoformat(), "actor": "Artista", "message": "Pedido criado manualmente."}]
        
        query = f'INSERT INTO comissoes (id, client, type, date, deadline, price, status, description, preview, comments, reference_files, phases, current_phase_index, revisions_used, event_log, payment_status) VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder})'
        cursor.execute(query, (new_id, data['client'], data['type'], today, data['deadline'], data['price'], 'pending_payment', data.get('description', ''), '[]', '[]', '[]', json.dumps(default_phases), 0, 0, json.dumps(initial_event), 'unpaid'))
        conn.commit()
        
        socketio.emit('commission_updated', {'commission_id': new_id})
        add_notification(f"Nova comissão #{new_id} para {data['client']} foi criada.")
        return jsonify({'success': True, 'message': 'Comissão criada com sucesso', 'id': new_id})
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'message': f'Erro no servidor: {e}'}), 500
    finally:
        cursor.close()
        conn.close()

@admin_bp.route('/api/comissoes/<string:comissao_id>', methods=['GET'])
@admin_required
def get_single_comissao(comissao_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    is_postgres = hasattr(conn, 'cursor_factory')
    placeholder = '%s' if is_postgres else '?'
    
    query = f'SELECT * FROM comissoes WHERE id = {placeholder}'
    cursor.execute(query, (comissao_id,))
    comissao = cursor.fetchone()
    cursor.close()
    conn.close()
    
    if comissao is None:
        return jsonify({'error': 'Comissão não encontrada'}), 404
    
    comissao_dict = dict(comissao)
    for key in ['comments', 'reference_files', 'preview', 'phases', 'event_log', 'assigned_artist_ids']:
        comissao_dict[key] = json.loads(comissao_dict[key]) if (comissao_dict[key] and comissao_dict[key] != '[]') else []
    return jsonify(comissao_dict)

@admin_bp.route('/api/comissoes/<string:comissao_id>', methods=['DELETE'])
@admin_required
def delete_comissao(comissao_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    is_postgres = hasattr(conn, 'cursor_factory')
    placeholder = '%s' if is_postgres else '?'
    
    try:
        query_select = f'SELECT client_id FROM comissoes WHERE id = {placeholder}'
        cursor.execute(query_select, (comissao_id,))
        comissao = cursor.fetchone()
        client_id = comissao['client_id'] if comissao else None

        query_delete = f'DELETE FROM comissoes WHERE id = {placeholder}'
        cursor.execute(query_delete, (comissao_id,))
        conn.commit()
        
        socketio.emit('commission_updated', {'commission_id': comissao_id, 'deleted': True})
        add_notification(f"A comissão #{comissao_id} foi excluída.")
        if client_id:
            add_notification(f"Sua comissão #{comissao_id} foi removida pelo artista.", commission_id=comissao_id, user_id=client_id)
        
        return jsonify({'success': True, 'message': 'Comissão excluída com sucesso'})
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'message': f'Erro no servidor: {e}'}), 500
    finally:
        cursor.close()
        conn.close()

@admin_bp.route('/api/comissoes/<string:comissao_id>/update_status', methods=['POST'])
@admin_required
def update_comissao_status(comissao_id):
    data = request.get_json()
    novo_status = data.get('status')
    conn = get_db_connection()
    cursor = conn.cursor()
    is_postgres = hasattr(conn, 'cursor_factory')
    placeholder = '%s' if is_postgres else '?'
    
    try:
        cursor.execute(f'SELECT client_id FROM comissoes WHERE id = {placeholder}', (comissao_id,))
        comissao = cursor.fetchone()
        client_id = comissao['client_id'] if comissao else None

        cursor.execute(f'UPDATE comissoes SET status = {placeholder} WHERE id = {placeholder}', (novo_status, comissao_id))
        
        status_traduzido = translate_status(novo_status)
        add_event_to_log(conn, comissao_id, "Artista", f"Alterou o status para '{status_traduzido}'.")
        conn.commit()
        
        socketio.emit('commission_updated', {'commission_id': comissao_id})
        add_notification(f"O status da comissão #{comissao_id} foi alterado para '{status_traduzido}'.")
        if client_id:
            add_notification(f"O status do seu pedido #{comissao_id} foi atualizado para '{status_traduzido}'.", commission_id=comissao_id, user_id=client_id)
        
        return jsonify({'success': True, 'message': 'Status atualizado com sucesso'})
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'message': f'Erro no servidor: {e}'}), 500
    finally:
        cursor.close()
        conn.close()

@admin_bp.route('/api/comissoes/<string:comissao_id>/update', methods=['POST'])
@admin_required
def update_comissao(comissao_id):
    data = request.get_json()
    conn = get_db_connection()
    cursor = conn.cursor()
    is_postgres = hasattr(conn, 'cursor_factory')
    placeholder = '%s' if is_postgres else '?'
    
    try:
        cursor.execute(f'SELECT client_id FROM comissoes WHERE id = {placeholder}', (comissao_id,))
        comissao = cursor.fetchone()
        client_id = comissao['client_id'] if comissao else None

        query_update = f'UPDATE comissoes SET client = {placeholder}, type = {placeholder}, price = {placeholder}, deadline = {placeholder}, description = {placeholder} WHERE id = {placeholder}'
        cursor.execute(query_update, (data['client'], data['type'], data['price'], data['deadline'], data['description'], comissao_id))
        add_event_to_log(conn, comissao_id, "Artista", "Editou os detalhes gerais do pedido.")
        conn.commit()
        
        socketio.emit('commission_updated', {'commission_id': comissao_id})
        add_notification(f"Os dados da comissão #{comissao_id} foram atualizados.")
        if client_id:
            add_notification(f"Os detalhes do seu pedido #{comissao_id} foram atualizados pelo artista.", commission_id=comissao_id, user_id=client_id)
        
        return jsonify({'success': True, 'message': 'Comissão atualizada com sucesso'})
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'message': f'Erro no servidor: {e}'}), 500
    finally:
        cursor.close()
        conn.close()

@admin_bp.route('/api/comissoes/<string:comissao_id>/comment', methods=['POST'])
@admin_required
def admin_add_comment(comissao_id):
    data = request.get_json()
    conn = get_db_connection()
    cursor = conn.cursor()
    is_postgres = hasattr(conn, 'cursor_factory')
    placeholder = '%s' if is_postgres else '?'
    
    try:
        cursor.execute(f'SELECT comments, client_id FROM comissoes WHERE id = {placeholder}', (comissao_id,))
        order = cursor.fetchone()
        client_id = order['client_id'] if order else None
        
        comments = json.loads(order['comments']) if order and order['comments'] else []
        new_comment = {"author": "Artista", "is_artist": True, "date": datetime.now().isoformat(), "text": data.get('text')}
        comments.append(new_comment)
        
        cursor.execute(f'UPDATE comissoes SET comments = {placeholder} WHERE id = {placeholder}', (json.dumps(comments), comissao_id))
        add_event_to_log(conn, comissao_id, "Artista", "Adicionou um novo comentário.")
        conn.commit()
        
        socketio.emit('commission_updated', {'commission_id': comissao_id})
        add_notification(f"Você respondeu ao pedido #{comissao_id}", comissao_id)
        if client_id:
            add_notification(f"O artista enviou uma nova mensagem no pedido #{comissao_id}.", commission_id=comissao_id, user_id=client_id)
            
        return jsonify({'success': True, 'comment': new_comment})
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'message': f'Erro no servidor: {e}'}), 500
    finally:
        cursor.close()
        conn.close()

@admin_bp.route('/api/comissoes/<string:comissao_id>/preview', methods=['POST'])
@admin_required
def add_preview(comissao_id):
    data = request.get_json()
    conn = get_db_connection()
    cursor = conn.cursor()
    is_postgres = hasattr(conn, 'cursor_factory')
    placeholder = '%s' if is_postgres else '?'
    
    try:
        query_select = f'SELECT preview, phases, current_phase_index, client_id FROM comissoes WHERE id = {placeholder}'
        cursor.execute(query_select, (comissao_id,))
        order = cursor.fetchone()
        client_id = order['client_id'] if order else None
        
        previews = json.loads(order['preview']) if order['preview'] else []
        new_preview = {"version": f"{len(previews) + 1}.0", "date": datetime.now().isoformat(), "url": data.get('url'), "comment": data.get('comment', '')}
        previews.append(new_preview)
        
        query_update = f'UPDATE comissoes SET preview = {placeholder}, current_preview = {placeholder}, status = {placeholder} WHERE id = {placeholder}'
        cursor.execute(query_update, (json.dumps(previews), len(previews) - 1, 'waiting_approval', comissao_id))
        
        phases = json.loads(order['phases'])
        current_phase_name = phases[order['current_phase_index']]['name']
        add_event_to_log(conn, comissao_id, "Artista", f"Enviou uma prévia para a fase '{current_phase_name}'.")
        conn.commit()
        
        socketio.emit('commission_updated', {'commission_id': comissao_id})
        add_notification(f"Nova pré-visualização adicionada ao pedido #{comissao_id}", comissao_id)
        if client_id:
            add_notification(f"Uma nova pré-visualização foi enviada para o seu pedido #{comissao_id}.", commission_id=comissao_id, user_id=client_id)
        
        return jsonify({'success': True, 'preview': new_preview})
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'message': f'Erro no servidor: {e}'}), 500
    finally:
        cursor.close()
        conn.close()

@admin_bp.route('/api/comissoes/<string:comissao_id>/confirm_payment', methods=['POST'])
@admin_required
def admin_confirm_payment(comissao_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    is_postgres = hasattr(conn, 'cursor_factory')
    placeholder = '%s' if is_postgres else '?'
    
    try:
        cursor.execute(f'SELECT client_id FROM comissoes WHERE id = {placeholder}', (comissao_id,))
        comissao = cursor.fetchone()
        client_id = comissao['client_id'] if comissao else None

        query_update = f"UPDATE comissoes SET payment_status = 'paid', status = 'in_progress' WHERE id = {placeholder}"
        cursor.execute(query_update, (comissao_id,))
        add_event_to_log(conn, comissao_id, "Artista", "Pagamento confirmado.")
        add_event_to_log(conn, comissao_id, "Sistema", "Status do pedido alterado para 'Em Progresso'.")
        conn.commit()
        
        socketio.emit('commission_updated', {'commission_id': comissao_id})
        add_notification(f"O pagamento do pedido #{comissao_id} foi confirmado! O trabalho foi iniciado.", comissao_id)
        if client_id:
            add_notification(f"O pagamento do seu pedido #{comissao_id} foi confirmado!", commission_id=comissao_id, user_id=client_id)
        
        return jsonify({'success': True, 'message': 'Pagamento confirmado com sucesso.'})
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'message': f'Erro no servidor: {e}'}), 500
    finally:
        cursor.close()
        conn.close()