import eventlet
# O monkey_patch é necessário aqui para rodar o site localmente com o comando 'python run.py'
eventlet.monkey_patch(all=True, psycopg=True)

from app import create_app, socketio

app = create_app()

if __name__ == '__main__':
    # Este comando inicia o servidor de desenvolvimento do SocketIO
    # Não é usado pela Render, mas é útil para você testar na sua máquina
    socketio.run(app, debug=True, port=5000)
