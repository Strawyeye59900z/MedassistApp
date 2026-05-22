# Medassist - Auxiliar Hospitalar Inteligente 🩺

Medassist é um auxiliar hospitalar inteligente projetado para extrair, organizar e formatar exames médicos, organizar prontuários (notas de admissão/evolução) e catalogar condutas clínicas e protocolos através de inteligência artificial de alta velocidade.

Esta versão inclui **Autenticação Firebase por e-mail e senha** e controle administrativo de usuários, ideal para auto-hospedagem ou uso institucional em servidores próprios.

---

## 🚀 Guia de Hospedagem Própria (Proxmox LXC)

Siga este passo a passo para implantar o Medassist em um contêiner Linux (LXC) no seu servidor Proxmox VE.

### 1. Pré-requisitos no LXC (Debian / Ubuntu recomendados)

Conecte no console do seu LXC e certifique-se de instalar as dependências fundamentais:

```bash
# Atualizar listas de pacotes
apt update && apt upgrade -y

# Instalar Node.js 20+ (Nodesource)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs git build-essential

# Instalar o PM2 globalmente para gerenciar o processo do servidor em segundo plano
npm install -g pm2
```

### 2. Clonando o Projeto do seu GitHub

Clone o repositório privado ou público configurado no seu GitHub:

```bash
cd /var/www
git clone <URL_DO_SEU_REPOSITORIO_GITHUB> medassist
cd medassist
```

### 3. Configurando Variáveis de Ambiente e Firebase

Copie o arquivo de exemplo de ambiente e preencha as variáveis correspondentes:

```bash
cp .env.example .env
nano .env
```

Garanta que sua chave de API padrão do Gemini (`GEMINI_API_KEY`) esteja no arquivo `.env`.

#### Arquivo `firebase-applet-config.json`
Certifique-se de que o arquivo `firebase-applet-config.json` contém suas credenciais válidas do Firebase, que foram configuradas na criação do app:
```json
{
  "apiKey": "...",
  "authDomain": "...",
  "projectId": "...",
  "storageBucket": "...",
  "messagingSenderId": "...",
  "appId": "...",
  "measurementId": "...",
  "firestoreDatabaseId": "..."
}
```

---

## 🔄 Fluxo de Atualização Simples pelo GitHub

Para atualizar o aplicativo no seu servidor LXC sempre que fizer commit ou alterações no GitHub, execute o seguinte script simplificado:

```bash
# Navegar até a pasta do projeto
cd /var/www/medassist

# Baixar as últimas alterações do repositório
git pull

# Instalar novas dependências (se houver)
npm install

# Compilar o sistema para produção (Vite + esbuild do servidor backend)
npm run build

# Reiniciar o serviço no PM2 para aplicar as mudanças de código de forma imediata
pm2 restart medassist
```

> **Dica de Automação:** Você pode colocar essa sequência em um script bash local no LXC, ex: `nano update.sh` de modo a atualizar o app com apenas `./update.sh`.

---

## 🛠️ Gerenciando o Processo de Produção (PM2)

Para iniciar o servidor Medassist no PM2 (rodando na porta `3000` padrão por trás de um proxy Nginx ou acesso direto IP:3000):

```bash
# Iniciar a aplicação
pm2 start dist/server.cjs --name medassist

# Garantir que o aplicativo inicie automaticamente após reboots do LXC
pm2 startup
pm2 save
```

Para monitorar logs ou status do sistema em tempo real:
```bash
pm2 logs medassist
pm2 status
```

---

## 🔒 Regras de Acesso e Segurança do Firebase

Este projeto utiliza duas coleções do Firestore:
1. `users_registered`: Mantém o registro histórico de logins autorizados.
2. `users`: Contém as preferências e histórico individuais dos usuários médicos.

### Configuração de Administrador
*   O usuário de e-mail **`gabriel.nunez.costa@gmail.com`** possui privilégios de **Administrador**.
*   Apenas o Administrador pode efetuar autenticação via **Google Sign-In**.
*   Uma vez logado, uma tela adicional **Gerenciar** ficará disponível no menu inferior. O administrador pode listar todos os usuários da plataforma e **excluir contas** que não devem ter mais acesso.
*   Uma vez excluída pelo painel de gerenciamento as permissões no banco serão revogadas e o usuário será desconectado e impedido de logar novamente.
