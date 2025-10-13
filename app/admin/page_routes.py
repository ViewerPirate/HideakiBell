# Arquivo: app/admin/page_routes.py

from flask import render_template
from app.utils import admin_required

# Importa o blueprint 'admin_bp' do nosso arquivo orquestrador
from .routes import admin_bp

# --- Rotas das Páginas ---
@admin_bp.route('/dashboard')
@admin_required
def admin_dashboard():
    return render_template('admin/pages/dashboard.html')


@admin_bp.route('/galeria')
@admin_required
def admin_galeria():
    return render_template('admin/pages/galeria.html')


@admin_bp.route('/comissoes')
@admin_required
def admin_comissoes():
    return render_template('admin/pages/comissoes.html')


@admin_bp.route('/clientes')
@admin_required
def admin_clientes():
    return render_template('admin/pages/clientes.html')


@admin_bp.route('/mensagens')
@admin_required
def admin_mensagens():
    return render_template('admin/pages/mensagens.html')


@admin_bp.route('/agenda')
@admin_required
def admin_agenda():
    return render_template('admin/pages/agenda.html')


@admin_bp.route('/financeiro')
@admin_required
def admin_financeiro():
    return render_template('admin/pages/financeiro.html')


@admin_bp.route('/relatorios')
@admin_required
def admin_relatorios():
    return render_template('admin/pages/relatorios.html')


@admin_bp.route('/configuracoes')
@admin_required
def admin_configuracoes():
    return render_template('admin/pages/configuracoes.html')

# --- INÍCIO DA MODIFICAÇÃO ---
@admin_bp.route('/meu-perfil')
@admin_required
def admin_meu_perfil():
    """Renderiza a nova página de perfil do artista."""
    return render_template('admin/pages/meu_perfil.html')
# --- FIM DA MODIFICAÇÃO ---

@admin_bp.route('/plugins')
@admin_required
def admin_plugins():
    """Renderiza a nova página de gerenciamento de plugins."""
    return render_template('admin/pages/plugins.html')