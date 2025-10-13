# Arquivo: app/admin/api_settings_routes.py

import json
import os
from flask import request, jsonify, session
from app.utils import get_db_connection, admin_required
from .routes import admin_bp

@admin_bp.route('/api/settings', methods=['GET', 'POST'])
@admin_required
def manage_settings():
    conn = get_db_connection()
    # --- INÍCIO DA CORREÇÃO ---
    cursor = conn.cursor()
    is_postgres = hasattr(conn, 'cursor_factory')
    placeholder = '%s' if is_postgres else '?'

    try:
        if request.method == 'POST':
            data = request.get_json()
            
            for key, value in data.items():
                db_value = json.dumps(value) if isinstance(value, (list, dict)) else str(value)
                
                if is_postgres:
                    # Sintaxe para "UPSERT" (update or insert) em PostgreSQL
                    query = f'INSERT INTO settings (key, value) VALUES ({placeholder}, {placeholder}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value'
                else:
                    # Sintaxe para "UPSERT" em SQLite
                    query = f'INSERT OR REPLACE INTO settings (key, value) VALUES ({placeholder}, {placeholder})'
                
                cursor.execute(query, (key, db_value))
            
            conn.commit()
            return jsonify({'success': True, 'message': 'Configurações salvas.'})
        
        # Método GET
        else:
            cursor.execute('SELECT key, value FROM settings')
            settings_db = cursor.fetchall()
            settings = {row['key']: row['value'] for row in settings_db}
            
            json_keys_from_settings = [
                'social_links', 'commission_types', 'commission_extras', 
                'default_phases', 'support_contacts'
            ]

            for key in json_keys_from_settings:
                if key in settings and settings[key]:
                    try:
                        settings[key] = json.loads(settings[key])
                    except (json.JSONDecodeError, TypeError):
                        settings[key] = []
                else:
                    settings[key] = []
                    
            return jsonify(settings)
            
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'message': f'Erro no servidor: {e}'}), 500
    finally:
        cursor.close()
        conn.close()
    # --- FIM DA CORREÇÃO ---