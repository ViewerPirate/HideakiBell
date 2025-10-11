import eventlet
# O monkey_patch é a primeira coisa a ser feita, essencial para o Gunicorn com eventlet.
eventlet.monkey_patch(all=True, psycopg=True)

# Em vez de importar de 'run.py', importamos a fábrica de criação do app diretamente.
from app import create_app

# Criamos a instância da aplicação aqui. Gunicorn irá procurar por esta variável 'app'.
app = create_app()
