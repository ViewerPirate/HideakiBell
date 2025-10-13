import sqlite3
import sys

DATABASE = 'database.db'

def get_db_connection():
    """Cria e retorna uma conexão com o banco de dados."""
    conn = sqlite3.connect(DATABASE)
    return conn

def manage_admin_status(username_arg, action):
    """
    Promove ou rebaixa um usuário, alterando o status 'is_admin'.
    Ação pode ser 'promote' (promover) ou 'demote' (rebaixar).
    """
    if not username_arg:
        print("Erro: Nome de usuário não fornecido.")
        print("Uso: python manage_admin.py [promote|demote] nome_de_usuario")
        return

    if action not in ['promote', 'demote']:
        print(f"Erro: Ação '{action}' é inválida. Use 'promote' or 'demote'.")
        return

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Verifica se o usuário existe na tabela 'users' pelo nome de usuário
        cursor.execute("SELECT id, is_admin FROM users WHERE username = ?", (username_arg,))
        user = cursor.fetchone()

        if user is None:
            print(f"Erro: Usuário com o nome '{username_arg}' não foi encontrado.")
            return

        user_id, current_status = user
        new_status = 1 if action == 'promote' else 0

        if current_status == new_status:
            status_text = "administrador" if new_status == 1 else "usuário comum"
            print(f"Nenhuma ação necessária. O usuário '{username_arg}' já é um {status_text}.")
            return

        # Atualiza o status do usuário
        cursor.execute("UPDATE users SET is_admin = ? WHERE username = ?", (new_status, username_arg))
        conn.commit()

        status_text = "promovido a administrador" if new_status == 1 else "rebaixado para usuário comum"
        print(f"Sucesso! O usuário '{username_arg}' foi {status_text}.")

    except sqlite3.Error as e:
        print(f"Erro no banco de dados: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print("Uso: python manage_admin.py [promote|demote] nome_de_usuario")
        sys.exit(1)
    
    action_arg = sys.argv[1]
    username_arg = sys.argv[2]
    manage_admin_status(username_arg, action_arg)