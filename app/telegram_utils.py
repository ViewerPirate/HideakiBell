# --- Conteúdo do arquivo: app/telegram_utils.py ---

import sqlite3
import os
import psycopg2
from psycopg2.extras import DictCursor

def get_db_connection_for_utils():
    """Cria uma conexão de DB específica para este utilitário."""
 
    database_url = os.environ.get('DATABASE_URL')
    if database_url:
        conn = psycopg2.connect(database_url)
        conn.cursor_factory = DictCursor
    else:
        conn = sqlite3.connect('database.db')
        conn.row_factory = sqlite3.Row
    return conn

def send_telegram_message(message_body):
    """
    Busca as configurações do Telegram no banco de dados e envia uma mensagem.
    Esta versão é autônoma e não depende do contexto da aplicação Flask.
    """
    import requests
    conn = None  # Garante que 'conn' exista no escopo do 'finally'
    
    try:
        # --- INÍCIO DA CORREÇÃO ---
        # Removemos a criação desnecessária do app (create_app) e o app_context.
        # A função agora gerencia sua própria conexão de banco de dados diretamente.
        conn = get_db_connection_for_utils()
        cursor = conn.cursor()
        cursor.execute("SELECT key, value FROM settings WHERE key LIKE 'TELEGRAM_%'")
        settings_db = cursor.fetchall()
        settings = {row['key']: row['value'] for row in settings_db}
        # --- FIM DA CORREÇÃO ---

        if settings.get('TELEGRAM_ENABLED') != 'true':
            print(">>> AVISO: Envio via Telegram desabilitado nas configurações.")
            return False

        bot_token = settings.get('TELEGRAM_BOT_TOKEN')
        chat_id = settings.get('TELEGRAM_CHAT_ID')

        if not all([bot_token, chat_id]):
            print("!!! ERRO: O Token do Bot ou o Chat ID do Telegram estão faltando no banco de dados.")
            return False
        
        url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        payload = {
            'chat_id': chat_id,
            'text': message_body,
            'parse_mode': 'Markdown'
        }
  
        print(f">>> Tentando enviar mensagem para o Telegram Chat ID: {chat_id}...")
       
        response = requests.post(url, data=payload)
        response_data = response.json()

        if response.status_code == 200 and response_data.get('ok'):
            print(">>> Mensagem de Telegram enviada com sucesso!")
            return True
        else:
            print(f"!!! ERRO ao enviar mensagem para o Telegram. Resposta da API: {response_data}")
            return False

    except requests.exceptions.RequestException as e:
        print(f"!!! ERRO DE CONEXÃO ao tentar contatar a API do Telegram: {e}")
        return False
        
    except Exception as e:
        print(f"!!! ERRO INESPERADO ao enviar mensagem via Telegram: {e}")
        return False
    
    finally:
        # Garante que a conexão com o banco de dados sempre seja fechada.
        if conn:
            conn.close()
