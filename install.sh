#!/bin/bash

# ==============================================================================
# Medassist - Script de Instalação para LXC (Proxmox)
# ==============================================================================

# Cores para feedback visual elegante
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # Sem Cor

echo -e "${BLUE}======================================================================${NC}"
echo -e "${GREEN}             🩺 Medassist - Instalador do Auxiliar Clínico${NC}"
echo -e "${BLUE}======================================================================${NC}"
echo ""

# 1. Verificar se Node.js e NPM estão instalados
echo -e "${BLUE}[1/5] Verificando dependências do sistema...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}Erro: Node.js não encontrado. Por favor, instale o Node.js v20+ antes de executar.${NC}"
    exit 1
else
    echo -e "Node.js instalado: $(node -v)"
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}Erro: NPM não encontrado.${NC}"
    exit 1
else
    echo -e "NPM instalado: $(npm -v)"
fi

# 2. Configurando o Arquivo de Ambiente (.env)
echo ""
echo -e "${BLUE}[2/5] Configurando variáveis de ambiente (.env)...${NC}"

# Porta default
DEFAULT_PORT=3000
read -p "Qual porta deseja utilizar para o Medassist? (Pressione Enter para usar $DEFAULT_PORT): " CUSTOM_PORT
PORT=${CUSTOM_PORT:-$DEFAULT_PORT}

# Gemini API Key (opcional, já que usuário pode cadastrar na própria conta sincronizada)
echo -e "${YELLOW}Obs: No Medassist, cada médico cadastra sua própria chave de API do Gemini no primeiro login.${NC}"
read -p "Deseja inserir uma Chave de API padrão do Gemini para o servidor? (Pressione Enter para ignorar): " GEMINI_API_KEY

# URL do App
DEFAULT_URL="http://localhost:$PORT"
read -p "URL pública de acesso ao aplicativo? (Pressione Enter para usar $DEFAULT_URL): " APP_URL
FINAL_URL=${APP_URL:-$DEFAULT_URL}

# Escrita do arquivo .env
echo "Criando arquivo .env personalizado..."
cat <<EOF > .env
# Variáveis de ambiente geradas dinamicamente pelo script de instalação do Medassist
PORT=$PORT
GEMINI_API_KEY="$GEMINI_API_KEY"
APP_URL="$FINAL_URL"
NODE_ENV="production"
EOF

echo -e "${GREEN}✔ Arquivo .env criado com sucesso!${NC}"

# 3. Configuração do Firebase
echo ""
echo -e "${BLUE}[3/5] Verificando credenciais do Firebase...${NC}"
FIREBASE_FILE="firebase-applet-config.json"

if [ -f "$FIREBASE_FILE" ]; then
    echo -e "${GREEN}✔ O arquivo $FIREBASE_FILE já existe. Ele será preservado.${NC}"
else
    echo -e "${YELLOW}O arquivo $FIREBASE_FILE não foi encontrado nesta pasta.${NC}"
    echo -e "Este arquivo é obrigatório para que a autenticação de médicos e banco Firestore funcionem."
    echo ""
    read -p "Deseja colar as configurações JSON do seu Firebase agora? (s/n): " CONFIGURE_FIREBASE
    if [[ "$CONFIGURE_FIREBASE" =~ ^[Ss]$ ]]; then
        echo "Cole seu objeto JSON abaixo (Cole tudo e pressione Ctrl+D quando terminar):"
        cat > "$FIREBASE_FILE"
        echo ""
        echo -e "${GREEN}✔ Arquivo $FIREBASE_FILE criado e configurado!${NC}"
    else
        echo -e "${RED}Atenção: Não se esqueça de copiar manualmente o arquivo $FIREBASE_FILE com as chaves do site do Firebase antes de rodar o app.${NC}"
    fi
fi

# 4. Instalação das dependências
echo ""
echo -e "${BLUE}[4/5] Instalando dependências (npm install)...${NC}"
npm install
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✔ Dependências instaladas com sucesso!${NC}"
else
    echo -e "${RED}Erro ao instalar dependências. Verifique os logs do npm.${NC}"
    exit 1
fi

# 5. Compilação de Produção
echo ""
echo -e "${BLUE}[5/5] Compilando assets e backend para produção...${NC}"
npm run build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✔ Medassist compilado com sucesso para produção!${NC}"
else
    echo -e "${RED}Erro na compilação do projeto. Verifique o código-fonte.${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}======================================================================${NC}"
echo -e "🚀 ${GREEN}INSTALAÇÃO DO MEDASSIST CONCLUÍDA COM SUCESSO!${NC}"
echo -e "${GREEN}======================================================================${NC}"
echo ""
echo -e "Para iniciar o Medassist no seu ambiente Proxmox LXC com o gerenciador de processos PM2:"
echo ""
echo -e "1. ${YELLOW}Inicie o Medassist:${NC}"
echo -e "   pm2 start dist/server.cjs --name medassist"
echo ""
echo -e "2. ${YELLOW}Garanta que ele inicialize com o boot do container:${NC}"
echo -e "   pm2 startup"
echo -e "   pm2 save"
echo ""
echo -e "3. O Medassist estará rodando e acessível na porta: ${GREEN}$PORT${NC}"
echo -e "   URL do App: ${BLUE}$FINAL_URL${NC}"
echo ""
echo -e "Para atualizações automáticas fáceis do repositório no futuro, execute o script ${GREEN}./update.sh${NC}."
echo ""
