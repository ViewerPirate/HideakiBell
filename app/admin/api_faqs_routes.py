# Arquivo: app/admin/api_faqs_routes.py

import os
import json
from flask import request, jsonify
from app.utils import get_db_connection, admin_required
from .routes import admin_bp

@admin_bp.route('/api/faqs', methods=['GET'])
@admin_required
def get_faqs():
    """Busca e retorna todos os FAQs do banco de dados."""
    try:
        conn = get_db_connection()
        # --- INÍCIO DA CORREÇÃO ---
        cursor = conn.cursor()
        cursor.execute('SELECT id, question, answer, display_order FROM faqs ORDER BY display_order, id')
        faqs_db = cursor.fetchall()
        cursor.close()
        # --- FIM DA CORREÇÃO ---
        conn.close()
        
        faqs_list = [dict(row) for row in faqs_db]
        return jsonify(faqs_list)
        
    except Exception as e:
        print(f"!!! ERRO INESPERADO em get_faqs: {e}")
        return jsonify({'success': False, 'message': f"Ocorreu um erro inesperado no servidor: {e}"}), 500

@admin_bp.route('/api/faqs/sync', methods=['POST'])
@admin_required
def sync_faqs():
    """
    Sincroniza a lista de FAQs.
    Recebe a lista completa do frontend e atualiza o banco de dados.
    """
    faqs_from_frontend = request.get_json()
    if not isinstance(faqs_from_frontend, list):
        return jsonify({'success': False, 'message': 'Dados inválidos.'}), 400

    conn = get_db_connection()
    # --- INÍCIO DA CORREÇÃO ---
    cursor = conn.cursor()
    is_postgres = hasattr(conn, 'cursor_factory')
    placeholder = '%s' if is_postgres else '?'

    try:
        cursor.execute("SELECT id FROM faqs")
        existing_ids = {row['id'] for row in cursor.fetchall()}
        
        frontend_ids = {faq['id'] for faq in faqs_from_frontend if faq.get('id')}

        ids_to_delete = existing_ids - frontend_ids
        if ids_to_delete:
            params = tuple(ids_to_delete)
            placeholders_del = ','.join([placeholder] * len(params))
            cursor.execute(f"DELETE FROM faqs WHERE id IN ({placeholders_del})", params)

        for index, faq_data in enumerate(faqs_from_frontend):
            question = faq_data.get('question')
            answer = faq_data.get('answer')
            faq_id = faq_data.get('id')

            if not question or not answer:
                continue

            if faq_id in existing_ids:
                query_update = f"UPDATE faqs SET question = {placeholder}, answer = {placeholder}, display_order = {placeholder} WHERE id = {placeholder}"
                cursor.execute(query_update, (question, answer, index, faq_id))
            else:
                query_insert = f"INSERT INTO faqs (question, answer, display_order) VALUES ({placeholder}, {placeholder}, {placeholder})"
                cursor.execute(query_insert, (question, answer, index))
        
        conn.commit()
        return jsonify({'success': True, 'message': 'FAQs sincronizados com sucesso.'})

    except Exception as e:
        conn.rollback()
        print(f"!!! ERRO INESPERADO em sync_faqs: {e}")
        return jsonify({'success': False, 'message': f"Ocorreu um erro inesperado no servidor: {e}"}), 500
    finally:
        cursor.close()
        conn.close()
    # --- FIM DA CORREÇÃO ---