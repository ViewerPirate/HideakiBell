# Arquivo: app/db_setup.py

import sqlite3
import os
import json
import psycopg2
from psycopg2.extras import DictCursor
from werkzeug.security import generate_password_hash
from .utils import get_db_connection

def initialize_database():
    """Verifica, cria e popula o banco de dados se necessário."""
    print("Verificando a inicialização do banco de dados...")
    conn = None
    cursor = None 
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        is_postgres = hasattr(conn, 'cursor_factory')
        
        # --- INÍCIO DA CORREÇÃO ---
        # O bloco que verificava a existência da tabela 'users' e saía foi removido.
        # Agora, o script continuará e usará "CREATE TABLE IF NOT EXISTS" para todas as tabelas,
        # garantindo que qualquer tabela faltante seja criada sem apagar as existentes.
        # --- FIM DA CORREÇÃO ---

        print("Verificando e criando tabelas se necessário...")
        
        placeholder = '%s' if is_postgres else '?'
        autoincrement_syntax = 'SERIAL PRIMARY KEY' if is_postgres else 'INTEGER PRIMARY KEY AUTOINCREMENT'
        boolean_default_false = 'FALSE' if is_postgres else '0'

        cursor.execute(f'''
        CREATE TABLE IF NOT EXISTS users (
            id {autoincrement_syntax}, username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, is_admin BOOLEAN NOT NULL DEFAULT {boolean_default_false},
            is_blocked INTEGER NOT NULL DEFAULT 0, is_banned INTEGER NOT NULL DEFAULT 0,
            notify_on_site INTEGER NOT NULL DEFAULT 1, notify_by_email INTEGER NOT NULL DEFAULT 1,
            is_public_artist BOOLEAN NOT NULL DEFAULT {boolean_default_false}, artist_specialties TEXT,
            artist_portfolio_description TEXT, artist_avatar TEXT, social_links TEXT, artist_bio TEXT
        )''')

        cursor.execute(f'''
        CREATE TABLE IF NOT EXISTS comissoes (
            id TEXT PRIMARY KEY NOT NULL, client TEXT, type TEXT, date TEXT, deadline TEXT, price REAL, status TEXT,
            description TEXT, preview TEXT, comments TEXT, reference_files TEXT, client_id INTEGER,
            current_preview INTEGER, phases TEXT, current_phase_index INTEGER, revisions_used INTEGER,
            event_log TEXT, payment_status TEXT NOT NULL DEFAULT 'unpaid', payment_method TEXT, assigned_artist_ids TEXT
        )''')

        cursor.execute(f'''
        CREATE TABLE IF NOT EXISTS notifications (
            id {autoincrement_syntax}, user_id INTEGER, message TEXT NOT NULL, is_read INTEGER NOT NULL DEFAULT 0,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP, related_commission_id TEXT
        )''')

        cursor.execute(f'CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY NOT NULL, value TEXT)')

        cursor.execute(f'''
        CREATE TABLE IF NOT EXISTS gallery (
            id {autoincrement_syntax}, title TEXT NOT NULL, description TEXT, image_url TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, lineart_artist_id INTEGER, color_artist_id INTEGER,
            is_nsfw BOOLEAN NOT NULL DEFAULT {boolean_default_false}
        )''')

        cursor.execute(f'''
        CREATE TABLE IF NOT EXISTS contact_messages (
            id {autoincrement_syntax}, sender_name TEXT NOT NULL, sender_email TEXT NOT NULL,
            message_content TEXT NOT NULL, received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, is_read INTEGER NOT NULL DEFAULT 0
        )''')

        cursor.execute(f'''
        CREATE TABLE IF NOT EXISTS plugins (
            id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, description TEXT, version TEXT, code TEXT NOT NULL,
            is_active INTEGER NOT NULL DEFAULT 0, scope TEXT NOT NULL DEFAULT 'admin', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')
        
        cursor.execute(f'''
        CREATE TABLE IF NOT EXISTS faqs (
            id {autoincrement_syntax}, question TEXT NOT NULL, answer TEXT NOT NULL, display_order INTEGER
        )''')
        
        cursor.execute(f'''
        CREATE TABLE IF NOT EXISTS artist_services (
            id {autoincrement_syntax}, artist_id INTEGER NOT NULL, service_name TEXT NOT NULL, description TEXT,
            price REAL NOT NULL, deadline_days INTEGER, phases TEXT, is_active BOOLEAN NOT NULL DEFAULT {boolean_default_false},
            FOREIGN KEY (artist_id) REFERENCES users(id)
        )''')

        cursor.execute(f'''
        CREATE TABLE IF NOT EXISTS plugin_data (
            plugin_id TEXT NOT NULL,
            user_id INTEGER,
            key TEXT NOT NULL,
            value TEXT,
            PRIMARY KEY (plugin_id, user_id, key)
        )''')
        
        print("Tabelas verificadas.")
        
        # Verifica se a tabela de usuários está vazia para popular com dados iniciais
        cursor.execute('SELECT id FROM users LIMIT 1')
        user_exists = cursor.fetchone()

        if not user_exists:
            print("Populando com dados iniciais...")
            admin_pass = 'Admin@123'
            hashed_password = generate_password_hash(admin_pass)
            query_users = f'INSERT INTO users (username, password_hash, is_admin) VALUES ({placeholder}, {placeholder}, {placeholder})'
            cursor.execute(query_users, ('admin', hashed_password, True))
            print("Usuário 'admin' padrão criado.")

            default_settings = {
                'site_mode': 'individual', 'studio_name': 'Nome do Estúdio', 'artist_name': 'Seu Nome Artístico',
                'artist_email': 'contato@seu-site.com', 'artist_location': 'Sua Cidade, Seu Estado',
                'artist_bio': 'Bem-vindo ao meu portfólio! Sou um artista apaixonado por criar obras únicas. Explore minha galeria para conhecer mais sobre meu trabalho.',
                'artist_process': 'Meu processo criativo envolve uma combinação de técnicas digitais e tradicionais para dar vida às minhas ideias.',
                'artist_inspirations': 'Minhas inspirações vêm da natureza, da cultura pop e das emoções humanas.',
                'home_headline': 'Bem-vindo à minha Galeria Digital',
                'home_subheadline': 'Explore um universo de cores e formas.',
                'social_links': '[]', 'commission_types': '[]', 'commission_extras': '[]',
                'default_phases': json.dumps([{"name": "Esboço", "revisions_limit": 3}, {"name": "Arte Final", "revisions_limit": 1}]),
                'refund_policy': 'Pedidos cancelados antes do início da fase de esboço são elegíveis para um reembolso de 50%.',
                'revision_alert_text': 'Você possui <strong>{revisions_left} de {revisions_limit}</strong> revisões restantes para esta fase.',
                'custom_css_theme': '', 'paypal_email': os.environ.get('PAYPAL_EMAIL', ''), 'paypal_hosted_button_id': os.environ.get('PAYPAL_HOSTED_BUTTON_ID', ''),
                'payment_currency_code': 'BRL', 'pix_key': '', 'TELEGRAM_ENABLED': 'false', 'TELEGRAM_BOT_TOKEN': os.environ.get('TELEGRAM_BOT_TOKEN', ''),
                'TELEGRAM_CHAT_ID': os.environ.get('TELEGRAM_CHAT_ID', ''),
                'TELEGRAM_TEMPLATE_CONTACT': '🔔 *Nova mensagem de contato!*\n\n*De:* {name}\n*Email:* {email}\n\n*Mensagem:*\n{message}',
                'TELEGRAM_TEMPLATE_NEW_COMMISSION': '🎨 *Novo Pedido Recebido!*\n\n*ID:* {commission_id}\n*Cliente:* {client_name}\n*Tipo:* {commission_type}\n*Valor:* R$ {price}'
            }
            query_settings = f"INSERT INTO settings (key, value) VALUES ({placeholder}, {placeholder})"
            for key, value in default_settings.items():
                cursor.execute(query_settings, (key, value))
            print("Configurações padrão inseridas.")
        else:
            print("Banco de dados já populado. Nenhuma ação de população necessária.")

        conn.commit()
        print("Setup do banco de dados concluído com sucesso!")

    except Exception as e:
        print(f"ERRO CRÍTICO durante a inicialização do banco de dados: {e}")
        if conn:
            conn.rollback()
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
