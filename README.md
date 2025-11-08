# 💸 Meus Boletos

Sistema completo para organizar e gerenciar boletos bancários, com processamento automático de código de barras e linha digitável.

## 🚀 Funcionalidades

- 📄 **Upload de PDF**: Faça upload de boletos em PDF e extraia automaticamente todas as informações
- ✅ **Processamento Inteligente**: Analisa automaticamente código de barras (44 dígitos) ou linha digitável (47 dígitos)
- 📊 **Extração Automática**: Identifica banco, valor, vencimento, beneficiário e número do documento
- 📋 **Gerenciamento Completo**: Adicione, edite, exclua e marque boletos como pagos
- 🔍 **Busca e Filtros**: Filtre por status (pendente, pago, vencido) e pesquise por descrição
- 📈 **Estatísticas**: Visualize total de boletos, pendentes, vencidos e valor total a pagar
- 📅 **Alertas**: Notificações visuais para boletos próximos do vencimento
- 📋 **Copiar Códigos**: Botões para copiar código de barras e linha digitável com um clique
- 💾 **Persistência**: Dados salvos automaticamente no localStorage
- 📤 **Import/Export**: Exporte e importe seus dados em JSON

## 🛠️ Tecnologias

- **React 19** - Interface moderna e reativa
- **TypeScript** - Tipagem estática e segurança
- **Chakra UI v3** - Componentes de interface elegantes
- **React Router DOM** - Navegação entre páginas
- **PDF.js** - Leitura e extração de dados de PDFs
- **Vite** - Build tool rápido e moderno
- **React Icons** - Ícones bonitos

## 📦 Instalação

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview da build
npm run preview
```

## 🎯 Como Usar

### 1. Adicionar um Boleto

#### Opção A: Upload de PDF 📄
1. Clique em "Adicionar Boleto"
2. Clique no botão **"Upload de Boleto PDF"**
3. Selecione o arquivo PDF do boleto (máximo 10MB)
4. O sistema irá automaticamente:
   - Extrair o código de barras ou linha digitável
   - Identificar o beneficiário
   - Preencher valor e data de vencimento
   - Validar as informações
5. Revise os dados extraídos e adicione uma descrição
6. Clique em "Salvar Boleto"

#### Opção B: Código Manual ⌨️
1. Clique em "Adicionar Boleto"
2. Cole o código de barras (44 dígitos) ou linha digitável (47 dígitos)
3. Clique em "Processar Código"
4. O sistema extrairá automaticamente:
   - Banco emissor
   - Valor do boleto
   - Data de vencimento
5. Preencha a descrição (obrigatório) e dados adicionais
6. Clique em "Salvar Boleto"

### 2. Copiar Códigos

Cada boleto possui botões para copiar:
- **Código de Barras**: Para pagamento por aplicativos
- **Linha Digitável**: Para digitação manual

### 3. Gerenciar Boletos

- **Marcar como Pago**: Altere o status de pendente para pago
- **Filtrar**: Por status (todos, pendentes, pagos, vencidos, cancelados)
- **Ordenar**: Por vencimento, valor ou data de criação
- **Buscar**: Procure por descrição, beneficiário ou código

### 4. Backup e Restore

- **Exportar**: Baixe todos os dados em JSON
- **Importar**: Restaure dados de um arquivo JSON anterior

## 📂 Estrutura do Projeto

```
src/
├── components/          # Componentes React
│   ├── BoletoCard.tsx  # Card de exibição do boleto
│   ├── BoletoForm.tsx  # Formulário de criação
│   └── ui/             # Componentes de UI reutilizáveis
├── pages/              # Páginas da aplicação
│   ├── Home.tsx        # Página principal
│   └── About/          # Página sobre
├── services/           # Lógica de negócio
│   ├── boletoParser.ts # Parser de código de barras
│   └── storage.ts      # Gerenciamento de localStorage
├── types/              # Definições TypeScript
│   └── boleto.ts       # Tipos do domínio
└── routes/             # Configuração de rotas
    └── index.tsx
```

## 🔧 Serviços

### Parser de Boletos (`boletoParser.ts`)

Processa códigos de boletos bancários brasileiros:
- Valida código de barras (44 dígitos) e linha digitável (47 dígitos)
- Calcula dígitos verificadores (módulo 10 e 11)
- Extrai informações: banco, valor, vencimento
- Converte entre código de barras e linha digitável

### Storage (`storage.ts`)

Gerencia persistência de dados:
- CRUD completo de boletos
- Atualização automática de status (vencidos)
- Export/Import em JSON
- Validações de integridade

## 🎨 Componentes Principais

### BoletoCard
Exibe informações completas do boleto com:
- Status colorido (pendente, pago, vencido)
- Dados do banco e beneficiário
- Valor formatado em R$
- Data de vencimento com dias restantes
- Botões de ação (copiar, editar, excluir, marcar como pago)

### BoletoForm
Formulário inteligente com:
- Validação de código em tempo real
- Extração automática de dados
- Preview das informações extraídas
- Campos personalizáveis

## 🌟 Diferenciais

- **Zero Dependências Externas**: Parser 100% implementado em TypeScript
- **Validação Robusta**: Verifica dígitos verificadores segundo padrões bancários
- **UX Otimizada**: Feedback visual imediato e notificações toast
- **Responsivo**: Funciona perfeitamente em desktop e mobile
- **Type-Safe**: TypeScript em 100% do código

## 📝 Acesso

A aplicação está rodando em: **http://localhost:5173/**

## 🎉 Pronto para usar!

Comece adicionando seus boletos e nunca mais perca um vencimento!
