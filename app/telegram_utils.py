# --- Conteúdo do arquivo: app/telegram_utils.py ---

import sqlite3
# import requests <-- MODIFICADO: Esta linha foi movida para dentro da função.
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
    """
    # --- INÍCIO DA CORREÇÃO ---
    # A importação é feita aqui, garantindo que o monkey_patch já foi executado.
    import requests
    # --- FIM DA CORREÇÃO ---
    
    from app import create_app 
    
    try:
        app = create_app() 
        with app.app_context(): 
            conn = get_db_connection_for_utils()
            cursor = conn.cursor()
            cursor.execute('SELECT key, value FROM settings')
            settings_db = cursor.fetchall()
            cursor.close()
            conn.close()
            settings = {row['key']: row['value'] for row in settings_db}

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
