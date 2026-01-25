# Relatório de Auditoria de Segurança (Fase 2)

**Data:** 14/02/2025
**Auditor:** Jules (AI Security Auditor)
**Escopo:** Repositório Completo (Versão Server-Side)

## Resumo Executivo

A análise da nova arquitetura (Server-Side Monitoring) revelou avanços significativos em relação à versão anterior (Client-Side), eliminando vetores de ataque baseados em spoofing direto do frontend. No entanto, foram identificadas **falhas críticas de implementação** na lógica de correlação de pagamentos e na persistência de dados, que comprometem a funcionalidade básica e a resiliência financeira da aplicação.

A vulnerabilidade mais grave impede que o monitor de pagamentos identifique transações válidas, pois o identificador da sessão não é anexado à transação Stellar.

---

## Detalhamento das Vulnerabilidades

### 1. Ausência de Memo na Transação (Falha de Lógica de Negócio)
*   **Severidade:** 🔴 **Crítico**
*   **Localização:** `src/core/createPaymentSession.ts` (Linha ~120-130)
*   **Descrição:** O método `createPaymentSession` gera um `sessionId`, mas **falha em anexá-lo como Memo** na transação Stellar construída. O `TransactionBuilder` é instanciado e finalizado sem chamar `.addMemo()`.
*   **Impacto:**
    *   **Perda de Rastreabilidade:** O `PaymentMonitor` (backend) depende exclusivamente do Memo (`tx.memo`) para correlacionar uma transação na blockchain com uma sessão de pagamento pendente.
    *   **Perda de Fundos/Serviço:** O usuário pagará os fundos, a transação será confirmada na rede Stellar, mas o sistema do lojista nunca reconhecerá o pagamento.
*   **Sugestão de Correção:**
    ```typescript
    // src/core/createPaymentSession.ts
    // ...
    import { Memo } from "stellar-sdk";

    tx = new TransactionBuilder(sourceAccount, { ... })
      .addOperation(paymentOp)
      .addMemo(Memo.text(session.id)) // <--- ADICIONAR ISSO
      .setTimeout(60)
      .build();
    ```

### 2. Persistência em Memória (Risco de Perda de Dados)
*   **Severidade:** 🔴 **Crítico**
*   **Localização:** `src/server/paymentMonitor.ts` (Linhas 21-22)
*   **Descrição:** As listas de pagamentos pendentes (`pendingPayments`) e hashes processados (`processedHashes`) são armazenadas em variáveis `Map` e `Set` na memória RAM do processo Node.js.
*   **Impacto:**
    *   **Perda de Confirmações:** Se o servidor reiniciar (deploy, crash, manutenção), todos os pagamentos pendentes são esquecidos.
    *   **Risco de Replay:** A lista de `processedHashes` é limpa no restart. Se o servidor processar transações antigas novamente (dependendo da lógica de cursor), ele pode disparar webhooks duplicados (embora o monitor tente verificar o status "pending", se o pagamento também foi esquecido, o risco maior é o webhook não ser disparado ou ser disparado incorretamente se a lógica mudar).
*   **Sugestão de Correção:**
    *   Substituir o armazenamento em memória por um banco de dados persistente (Redis, PostgreSQL, MongoDB).

### 3. Vazamento de Memória e Negação de Serviço (DoS)
*   **Severidade:** 🟠 **Alto**
*   **Localização:** `src/server/paymentMonitor.ts` (Linhas 22 e 70)
*   **Descrição:**
    1.  `processedHashes` é um `Set` que cresce indefinidamente. Cada transação processada adiciona uma string ao conjunto.
    2.  `registerPayment` permite adicionar entradas ao mapa `pendingPayments` sem autenticação ou limitação de taxa (assumindo que o endpoint que chama essa função seja público ou acessível).
*   **Impacto:**
    *   O servidor eventualmente falhará por falta de memória (OOM - Out of Memory), causando indisponibilidade do serviço.
*   **Sugestão de Correção:**
    *   Implementar política de expiração (TTL) para os dados.
    *   Usar um banco de dados com índices apropriados em vez de arrays/sets em memória.
    *   Implementar Rate Limiting no endpoint de criação de sessão.

### 4. Concorrência e Falhas no Polling
*   **Severidade:** 🟠 **Alto**
*   **Localização:** `src/server/paymentMonitor.ts` (Método `start`, Linha ~90)
*   **Descrição:**
    1.  **Race Condition:** O loop `while (this.isPolling)` não lida adequadamente com o tempo de execução de `checkTransactions`. Se o processamento demorar mais que o `intervalMs`, execuções podem se sobrepor (se o `await` não fosse estrito, mas aqui ele bloqueia). O problema maior é se houver múltiplas instâncias do servidor rodando (escalabilidade horizontal): todas processarão as mesmas transações.
    2.  **Cursor Volátil:** O cursor inicia como "now". Se o servidor reiniciar, ele perde todas as transações que ocorreram durante o tempo de inatividade (downtime).
    3.  **Limite de Paginação:** `.limit(20)` pode ser insuficiente para altos volumes, fazendo com que transações sejam "empurradas" para fora da janela antes de serem processadas.
*   **Impacto:**
    *   Pagamentos não detectados durante reinicializações ou picos de tráfego.
    *   Processamento duplicado em ambientes escaláveis.
*   **Sugestão de Correção:**
    *   Persistir o cursor (paging token) da última transação processada no banco de dados. Ao iniciar, ler do último cursor salvo em vez de "now".
    *   Usar mecanismos de bloqueio (lock) distribuído ou garantir que apenas um worker processe transações de uma conta.

### 5. Segredos em Artefatos de Build
*   **Severidade:** 🟡 **Médio**
*   **Localização:** `examples/.next`, `.gitignore`
*   **Descrição:** O arquivo `.gitignore` na raiz não ignora explicitamente a pasta `.next` dentro de subdiretórios (como `examples/.next`). Se o exemplo Next.js for buildado localmente, artefatos contendo variáveis de ambiente (chaves de API, segredos) podem ser commitados acidentalmente.
*   **Impacto:**
    *   Vazamento de credenciais em repositórios públicos.
*   **Sugestão de Correção:**
    *   Adicionar `**/.next` ao `.gitignore`.

### 6. IDs de Sessão Previsíveis
*   **Severidade:** 🟡 **Médio**
*   **Localização:** `src/core/createPaymentSession.ts`
*   **Descrição:** O uso de `session-${Date.now()}` gera IDs previsíveis e com baixa entropia.
*   **Impacto:**
    *   Possibilita adivinhação de IDs e potenciais colisões em sistemas distribuídos de alta frequência.
*   **Sugestão de Correção:**
    *   Utilizar UUID v4 (`crypto.randomUUID()`).
    *   **Nota:** Se mudar para UUID, atente-se ao limite de 28 bytes do Memo Text da Stellar. Pode ser necessário usar `Memo.hash` ou encurtar o ID.

### 7. Uso de HTTP em Exemplo de Servidor "Seguro"
*   **Severidade:** 🟡 **Médio**
*   **Localização:** `examples/secure-server-example.mjs`
*   **Descrição:** O exemplo cria um servidor usando o módulo `http` padrão e escuta na porta 3001.
*   **Impacto:**
    *   Desenvolvedores podem copiar esse código para produção sem adicionar uma camada TLS (HTTPS), expondo os payloads e assinaturas a interceptação.
*   **Sugestão de Correção:**
    *   Adicionar um aviso explícito nos comentários: "DO NOT USE IN PRODUCTION WITHOUT HTTPS/TLS".

---

## Conclusão

A mudança para validação no backend foi a decisão correta. Contudo, a implementação atual possui **falhas lógicas impeditivas** (ausência de Memo) e **riscos de infraestrutura** (uso de memória volátil) que tornam o SDK inadequado para produção.

**Ação Imediata Recomendada:**
1.  Corrigir `createPaymentSession` para incluir o Memo na transação.
2.  Implementar persistência real (Banco de Dados) para o monitoramento de pagamentos.
