#!/bin/bash

# ==============================================================================
# Medassist - Script de Atualização Rápida pelo GitHub
# ==============================================================================

# Cores para feedback visual
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # Sem Cor

echo -e "${BLUE}======================================================================${NC}"
echo -e "${GREEN}             🔄 Medassist - Atualização Rápida pelo GitHub${NC}"
echo -e "${BLUE}======================================================================${NC}"
echo ""

# 1. Puxar alterações do repositório
echo -e "${BLUE}[1/4] Baixando novidades do GitHub (git pull)...${NC}"
git pull

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✔ Código-fonte sincronizado com sucesso.${NC}"
else
    echo -e "${RED}Ocorreu um problema ao rodar 'git pull'. Verifique as chaves SSH ou credenciais de acesso do Github.${NC}"
    exit 1
fi

# 2. Instalar possíveis novas dependências adicionadas ao package.json
echo ""
echo -e "${BLUE}[2/4] Sincronizando novas dependências (npm install)...${NC}"
npm install

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✔ Dependências sincronizadas com sucesso.${NC}"
else
    echo -e "${RED}Erro ao rodar npm install.${NC}"
    exit 1
fi

# 3. Compilar novamente o Frontend e o Backend agrupado
echo ""
echo -e "${BLUE}[3/4] Recompilando o projeto para produção (npm run build)...${NC}"
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✔ Compilação de produção concluída com sucesso.${NC}"
else
    echo -e "${RED}Erro na compilação do projeto. Rollback manual ou revisão do código recomendada.${NC}"
    exit 1
fi

# 4. Reiniciar o serviço do PM2 para carregar o novo server.cjs
echo ""
echo -e "${BLUE}[4/4] Reiniciando serviço do Medassist no PM2...${NC}"

if command -v pm2 &> /dev/null; then
    pm2 restart medassist
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✔ Medassist reiniciado no PM2 com sucesso e já está atualizado!${NC}"
    else
        echo -e "${YELLOW}Aviso: Falha ao tentar reiniciar o processo 'medassist' no PM2.${NC}"
        echo -e "Certifique-se de que iniciou o app no pm2 inicialmente com: ${YELLOW}pm2 start dist/server.cjs --name medassist${NC}"
    fi
else
    echo -e "${YELLOW}Aviso: PM2 não encontrado instalado neste container. Caso use outro gerenciador de serviços, reinicie-o de modo manual.${NC}"
fi

echo ""
echo -e "${GREEN}======================================================================${NC}"
echo -e "🎉 ${GREEN}MEDASSIST ATUALIZADO COM SUCESSO!${NC}"
echo -e "${GREEN}======================================================================${NC}"
echo ""
