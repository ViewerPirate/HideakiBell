# Arquivo: app/admin/api_reports_routes.py

import os
from flask import request, jsonify
from datetime import datetime
from collections import defaultdict
from app.utils import get_db_connection, admin_required
from .routes import admin_bp

@admin_bp.route('/api/agenda/comissoes', methods=['GET'])
@admin_required
def get_agenda_comissoes():
    conn = get_db_connection()
    # --- INÍCIO DA CORREÇÃO ---
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, client, type, deadline, status FROM comissoes WHERE status NOT IN ('completed', 'cancelled') ORDER BY deadline ASC"
    )
    comissoes_db = cursor.fetchall()
    cursor.close()
    # --- FIM DA CORREÇÃO ---
    conn.close()
    return jsonify([dict(row) for row in comissoes_db])

@admin_bp.route('/api/financeiro/dados', methods=['GET'])
@admin_required
def get_dados_financeiros():
    hoje = datetime.now()
    inicio_req = request.args.get('inicio', f'{hoje.year}-01-01')
    fim_req = request.args.get('fim', hoje.strftime('%Y-%m-%d'))
    
    conn = get_db_connection()
    # --- INÍCIO DA CORREÇÃO ---
    cursor = conn.cursor()
    is_postgres = hasattr(conn, 'cursor_factory')
    placeholder = '%s' if is_postgres else '?'
    
    query = f"SELECT price, date FROM comissoes WHERE status = 'completed' AND date BETWEEN {placeholder} AND {placeholder}"
    cursor.execute(query, (inicio_req, fim_req))
    comissoes_concluidas = cursor.fetchall()
    cursor.close()
    # --- FIM DA CORREÇÃO ---
    conn.close()

    total_receita = sum(c['price'] for c in comissoes_concluidas)
    total_comissoes = len(comissoes_concluidas)
    ticket_medio = total_receita / total_comissoes if total_comissoes > 0 else 0

    transacoes = [{'date': c['date'], 'price': c['price']} for c in comissoes_concluidas]
    
    receita_mensal = defaultdict(float)
    for c in comissoes_concluidas:
        mes_ano = datetime.strptime(c['date'], '%Y-%m-%d').strftime('%Y-%m')
        receita_mensal[mes_ano] += c['price']
    
    sorted_meses = sorted(receita_mensal.keys())
    grafico_labels = [datetime.strptime(ma, '%Y-%m').strftime('%b/%y') for ma in sorted_meses]
    grafico_data_values = [receita_mensal[ma] for ma in sorted_meses]

    return jsonify({
        'kpis': {
            'total_receita': total_receita,
            'total_comissoes': total_comissoes,
            'ticket_medio': ticket_medio
        },
        'transacoes': transacoes,
        'grafico_data': {
            'labels': grafico_labels,
            'data': grafico_data_values
        }
    })


@admin_bp.route('/api/relatorios/dados', methods=['GET'])
@admin_required
def get_relatorios_dados():
    year = request.args.get('ano', str(datetime.now().year))
    conn = get_db_connection()
    # --- INÍCIO DA CORREÇÃO ---
    cursor = conn.cursor()
    is_postgres = hasattr(conn, 'cursor_factory')
    placeholder = '%s' if is_postgres else '?'
    
    # Em PostgreSQL, o operador LIKE precisa de um placeholder
    like_pattern = f'{year}%'
    query = f"SELECT price, client, type, date FROM comissoes WHERE status = 'completed' AND date LIKE {placeholder}"
    cursor.execute(query, (like_pattern,))
    comissoes_ano = cursor.fetchall()
    cursor.close()
    # --- FIM DA CORREÇÃO ---
    conn.close()

    receita_anual = sum(c['price'] for c in comissoes_ano)
    total_comissoes = len(comissoes_ano)
    clientes_ativos = len(set(c['client'] for c in comissoes_ano))
    ticket_medio = receita_anual / total_comissoes if total_comissoes > 0 else 0

    kpis = {
        'receita_anual': receita_anual,
        'total_comissoes': total_comissoes,
        'clientes_ativos': clientes_ativos,
        'ticket_medio': ticket_medio
    }

    top_clientes_data = defaultdict(float)
    for c in comissoes_ano:
        top_clientes_data[c['client']] += c['price']
    
    sorted_clientes = sorted(top_clientes_data.items(), key=lambda item: item[1], reverse=True)
    top_clientes = [{'client': client, 'total': total} for client, total in sorted_clientes[:5]]

    receita_por_tipo = defaultdict(float)
    for c in comissoes_ano:
        receita_por_tipo[c['type']] += c['price']

    comissoes_por_mes = {month: 0 for month in range(1, 13)}
    for c in comissoes_ano:
        mes = datetime.strptime(c['date'], '%Y-%m-%d').month
        comissoes_por_mes[mes] += 1
    
    meses_nomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    volume_mensal_grafico = {meses_nomes[mes-1]: count for mes, count in comissoes_por_mes.items()}

    return jsonify({
        'kpis': kpis,
        'top_clientes': top_clientes,
        'receita_por_tipo': dict(receita_por_tipo),
        'comissoes_por_mes': volume_mensal_grafico
    })