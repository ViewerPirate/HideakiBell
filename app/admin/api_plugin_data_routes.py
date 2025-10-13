# Arquivo: app/admin/api_plugin_data_routes.py

import json
from flask import request, jsonify, session
from app.utils import get_db_connection, admin_required
from .routes import admin_bp

# Endpoint para SALVAR/ATUALIZAR dados de um plugin
@admin_bp.route('/api/plugin_data', methods=['POST'])
@admin_required
def set_plugin_data():
    data = request.get_json()
    plugin_id = data.get('plugin_id')
    user_id = session.get('user_id') # Salva os dados para o admin logado
    key = data.get('key')
    value = data.get('value') # O valor pode ser qualquer coisa (JSON, texto)

    if not all([plugin_id, key]):
        return jsonify({'success': False, 'message': 'plugin_id e key são obrigatórios.'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    is_postgres = hasattr(conn, 'cursor_factory')
    
    db_value = json.dumps(value) if isinstance(value, (dict, list)) else str(value)

    try:
        if is_postgres:
            # Sintaxe "UPSERT" para PostgreSQL
            query = """
                INSERT INTO plugin_data (plugin_id, user_id, key, value)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (plugin_id, user_id, key) DO UPDATE SET value = EXCLUDED.value;
            """
        else:
            # Sintaxe "UPSERT" para SQLite
            query = """
                INSERT OR REPLACE INTO plugin_data (plugin_id, user_id, key, value)
                VALUES (?, ?, ?, ?);
            """
        
        cursor.execute(query, (plugin_id, user_id, key, db_value))
        conn.commit()
        return jsonify({'success': True, 'message': 'Dados salvos com sucesso.'})

    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'message': f'Erro no servidor: {e}'}), 500
    finally:
        cursor.close()
        conn.close()

# Endpoint para BUSCAR dados de um plugin
@admin_bp.route('/api/plugin_data/<string:plugin_id>/<string:key>', methods=['GET'])
@admin_required
def get_plugin_data(plugin_id, key):
    user_id = session.get('user_id')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    is_postgres = hasattr(conn, 'cursor_factory')
    placeholder = '%s' if is_postgres else '?'

    try:
        query = f"SELECT value FROM plugin_data WHERE plugin_id = {placeholder} AND user_id = {placeholder} AND key = {placeholder}"
        cursor.execute(query, (plugin_id, user_id, key))
        row = cursor.fetchone()

        # --- INÍCIO DA CORREÇÃO ---
        # Se não encontrar dados, retorna sucesso com valor nulo em vez de 404.
        if row is None:
            return jsonify({'success': True, 'value': None})
        # --- FIM DA CORREÇÃO ---

        # Tenta decodificar o valor como JSON, se não conseguir, retorna como texto.
        try:
            value = json.loads(row['value'])
        except (json.JSONDecodeError, TypeError):
            value = row['value']

        return jsonify({'success': True, 'value': value})

    except Exception as e:
        return jsonify({'success': False, 'message': f'Erro no servidor: {e}'}), 500
    finally:
        cursor.close()
        conn.close()