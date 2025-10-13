# --- Código modificado para: app/utils.py ---

import sqlite3
import json
import os
import psycopg2
from psycopg2.extras import DictCursor
from datetime import datetime
from functools import wraps
from flask import flash, session, redirect, url_for

# --- INÍCIO DA MODIFICAÇÃO: Adição de novos ícones ao dicionário central ---
def get_icon_for_network(network_name):
    """
    Retorna a classe do ícone Font Awesome para um determinado nome de rede.
    Esta função centraliza a lógica de ícones para todo o site.
    """
    if not network_name:
        return 'fas fa-link' # Ícone padrão

    ICON_MAP = {
        'instagram': 'fab fa-instagram',
        'twitter': 'fab fa-twitter',
        'artstation': 'fab fa-artstation',
        'facebook': 'fab fa-facebook',
        'behance': 'fab fa-behance',
        'discord': 'fab fa-discord',
        'email': 'fas fa-envelope',
        'linkedin': 'fab fa-linkedin',
        'pinterest': 'fab fa-pinterest',
        'youtube': 'fab fa-youtube',
        'website': 'fas fa-globe',
        'whatsapp': 'fab fa-whatsapp',
        'telegram': 'fab fa-telegram',
        'ko-fi': 'fas fa-coffee',
        'kofi': 'fas fa-coffee' # Alias para Ko-fi
    }
    # Procura pela chave em minúsculas e retorna o ícone correspondente ou o padrão
    return ICON_MAP.get(network_name.lower(), 'fas fa-link')
# --- FIM DA MODIFICAÇÃO ---


# --- Funções Auxiliares e Decorators ---

def get_db_connection():
    """
    Cria e retorna uma conexão com o banco de dados.
    Conecta-se ao PostgreSQL se a DATABASE_URL estiver definida (no Render),
    caso contrário, usa o SQLite local.
    """
    database_url = os.environ.get('DATABASE_URL')
    if database_url:
        # Conexão com o PostgreSQL no Render
        conn = psycopg2.connect(database_url)
        # Usa DictCursor para que as linhas se comportem como dicionários (ex: row['id'])
        conn.cursor_factory = DictCursor
    else:
        # Conexão com o SQLite para desenvolvimento local
        conn = sqlite3.connect('database.db')
        conn.row_factory = sqlite3.Row
    return conn

def translate_status(status_key):
    """Traduz uma chave de status do sistema para um texto em português."""
    status_map = {
        'pending_payment': 'Aguardando Pagamento',
        'in_progress': 'Em Progresso',
        'waiting_approval': 'Aguardando Aprovação',
        'revisions': 'Em Revisão',
        'completed': 'Concluído',
        'cancelled': 'Cancelado'
    }
    return status_map.get(status_key, status_key.replace('_', ' ').capitalize())

def add_event_to_log(conn, commission_id, actor, message):
    """Busca o log de eventos atual, adiciona um novo evento e o salva de volta no banco."""
    try:
        cursor = conn.cursor()
        cursor.execute('SELECT event_log FROM comissoes WHERE id = %s', (commission_id,))
        log_row = cursor.fetchone()
        
        event_log = json.loads(log_row['event_log']) if log_row and log_row['event_log'] else []
        new_event = {
            "timestamp": datetime.now().isoformat(),
            "actor": actor,
            "message": message
        }
        event_log.append(new_event)
        
        # PostgreSQL usa %s como placeholder
        cursor.execute('UPDATE comissoes SET event_log = %s WHERE id = %s', (json.dumps(event_log), commission_id))
    except Exception as e:
        print(f"Erro inesperado no log: {e}")

def admin_required(f):
    """Decorator para proteger rotas que só administradores podem acessar."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('is_admin'):
            flash('Acesso negado. Esta área é apenas para administradores.', 'error')
            return redirect(url_for('auth.login'))
        return f(*args, **kwargs)
    return decorated_function

def login_required(f):
    """Decorator para proteger rotas que exigem login."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('Você precisa fazer login para acessar esta página.', 'error')
            return redirect(url_for('auth.login'))
        return f(*args, **kwargs)
    return decorated_function

def add_notification(message, commission_id=None, user_id=None):
    """Adiciona uma nova notificação ao banco de dados."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        # PostgreSQL usa %s como placeholder
        query = 'INSERT INTO notifications (message, timestamp, related_commission_id, is_read, user_id) VALUES (%s, %s, %s, 0, %s)'
        cursor.execute(query, (message, timestamp, commission_id, user_id))
        
        conn.commit()
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Erro ao adicionar notificação: {e}")