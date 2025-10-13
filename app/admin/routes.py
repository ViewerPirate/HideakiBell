# Arquivo: app/admin/routes.py (O Orquestrador)

from flask import Blueprint

# 1. Cria o Blueprint do admin, que será usado por todos os outros arquivos de rota.
admin_bp = Blueprint(
    'admin', 
    __name__, 
    url_prefix='/admin', 
    template_folder='../../templates'
)

# 2. Importa os módulos de rotas.
# Esta ação "registra" as rotas definidas nesses arquivos no admin_bp.
# É crucial que estas importações venham DEPOIS da criação do admin_bp.
from . import page_routes
from . import api_comissoes_routes
from . import api_clients_routes
from . import api_gallery_routes
from . import api_messages_routes
from . import api_reports_routes
from . import api_settings_routes
from . import api_plugins_routes
from . import api_faqs_routes
from . import api_profile_routes

# --- INÍCIO DA ADIÇÃO ---
from . import api_plugin_data_routes
# --- FIM DA ADIÇÃO ---