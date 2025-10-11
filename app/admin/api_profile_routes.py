# Arquivo: app/admin/api_profile_routes.py

import json
import os
from flask import request, jsonify, session
from app.utils import get_db_connection, admin_required
from .routes import admin_bp

@admin_bp.route('/api/profile', methods=['GET', 'POST'])
@admin_required
def manage_artist_profile():
    """
    Gerencia o perfil público do artista/administrador logado.
    """
    conn = get_db_connection()
    # --- INÍCIO DA CORREÇÃO ---
    cursor = conn.cursor()
    is_postgres = hasattr(conn, 'cursor_factory')
    placeholder = '%s' if is_postgres else '?'
    user_id = session.get('user_id')

    try:
        if request.method == 'POST':
            data = request.get_json()
            
            profile_data = {
                'username': data.get('artist_name'),
                'is_public_artist': True if data.get('is_public_artist') == 'true' else False,
                'artist_specialties': json.dumps(data.get('artist_specialties', [])),
                'artist_portfolio_description': data.get('artist_portfolio_description'),
                'artist_avatar': data.get('artist_avatar'),
                'social_links': json.dumps(data.get('social_links', [])),
                'artist_bio': data.get('artist_bio')
            }

            set_clauses = ', '.join([f"{key} = {placeholder}" for key in profile_data.keys()])
            values = list(profile_data.values()) + [user_id]
            
            query = f"UPDATE users SET {set_clauses} WHERE id = {placeholder}"
            cursor.execute(query, tuple(values))
            conn.commit()
            
            if 'username' in profile_data:
                session['username'] = profile_data['username']
            if 'artist_avatar' in profile_data:
                session['avatar_url'] = profile_data['artist_avatar']

            return jsonify({'success': True, 'message': 'Perfil salvo com sucesso!'})

        # Método GET
        else:
            query_select = f'SELECT username, is_public_artist, artist_specialties, artist_portfolio_description, artist_avatar, social_links, artist_bio FROM users WHERE id = {placeholder}'
            cursor.execute(query_select, (user_id,))
            user_profile_db = cursor.fetchone()

            if not user_profile_db:
                return jsonify({'error': 'Perfil não encontrado'}), 404

            profile_dict = dict(user_profile_db)
            profile_dict['artist_name'] = profile_dict.pop('username', None)

            try:
                profile_dict['artist_specialties'] = json.loads(profile_dict['artist_specialties']) if profile_dict['artist_specialties'] else []
            except (json.JSONDecodeError, TypeError):
                profile_dict['artist_specialties'] = []
                
            try:
                profile_dict['social_links'] = json.loads(profile_dict['social_links']) if profile_dict['social_links'] else []
            except (json.JSONDecodeError, TypeError):
                profile_dict['social_links'] = []
            
            return jsonify(profile_dict)
            
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'message': f'Erro no servidor: {e}'}), 500
    finally:
        cursor.close()
        conn.close()
    # --- FIM DA CORREÇÃO ---

@admin_bp.route('/api/profile/services', methods=['GET'])
@admin_required
def get_artist_services():
    user_id = session.get('user_id')
    conn = get_db_connection()
    cursor = conn.cursor()
    is_postgres = hasattr(conn, 'cursor_factory')
    placeholder = '%s' if is_postgres else '?'
    
    query = f"SELECT * FROM artist_services WHERE artist_id = {placeholder} ORDER BY id"
    cursor.execute(query, (user_id,))
    services_db = cursor.fetchall()
    cursor.close()
    conn.close()

    services_list = []
    for row in services_db:
        service = dict(row)
        try:
            service['phases'] = json.loads(service['phases']) if service['phases'] else []
        except (json.JSONDecodeError, TypeError):
            service['phases'] = []
        services_list.append(service)

    return jsonify(services_list)


@admin_bp.route('/api/profile/services/sync', methods=['POST'])
@admin_required
def sync_artist_services():
    user_id = session.get('user_id')
    services_from_frontend = request.get_json()
    if not isinstance(services_from_frontend, list):
        return jsonify({'success': False, 'message': 'Dados inválidos.'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    is_postgres = hasattr(conn, 'cursor_factory')
    placeholder = '%s' if is_postgres else '?'

    try:
        # Pega os IDs de serviços existentes no BD para este artista
        cursor.execute(f"SELECT id FROM artist_services WHERE artist_id = {placeholder}", (user_id,))
        existing_ids = {row['id'] for row in cursor.fetchall()}
        
        frontend_ids = {svc['id'] for svc in services_from_frontend if svc.get('id')}

        # Deleta serviços que estão no BD mas não foram enviados pelo frontend (foram removidos na UI)
        ids_to_delete = existing_ids - frontend_ids
        if ids_to_delete:
            params = tuple(list(ids_to_delete))
            placeholders_del = ','.join([placeholder] * len(ids_to_delete))
            # Garante que só delete os do próprio artista
            cursor.execute(f"DELETE FROM artist_services WHERE id IN ({placeholders_del}) AND artist_id = {placeholder}", params + (user_id,))

        # Itera sobre os serviços enviados pelo frontend para atualizar ou inserir
        for service_data in services_from_frontend:
            service_id = service_data.get('id')
            phases_json = json.dumps(service_data.get('phases', []))
            
            if service_id in existing_ids:
                # Se o ID já existe, atualiza o registro
                query_update = f"""
                    UPDATE artist_services SET 
                    service_name = {placeholder}, description = {placeholder}, price = {placeholder}, 
                    deadline_days = {placeholder}, phases = {placeholder}, is_active = {placeholder}
                    WHERE id = {placeholder} AND artist_id = {placeholder}
                """
                cursor.execute(query_update, (
                    service_data.get('service_name'), service_data.get('description'), service_data.get('price'),
                    service_data.get('deadline_days'), phases_json, service_data.get('is_active', True),
                    service_id, user_id
                ))
            else:
                # Se não tem ID, é um novo serviço, insere
                query_insert = f"""
                    INSERT INTO artist_services 
                    (artist_id, service_name, description, price, deadline_days, phases, is_active)
                    VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder})
                """
                cursor.execute(query_insert, (
                    user_id, service_data.get('service_name'), service_data.get('description'), 
                    service_data.get('price'), service_data.get('deadline_days'), phases_json, 
                    service_data.get('is_active', True)
                ))
        
        conn.commit()
        return jsonify({'success': True, 'message': 'Serviços sincronizados com sucesso.'})

    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'message': f"Ocorreu um erro no servidor: {e}"}), 500
    finally:
        cursor.close()
        conn.close()