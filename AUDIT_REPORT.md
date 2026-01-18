# Relatório de Auditoria de Segurança

**Data:** 14/02/2025
**Auditor:** Jules (AI Security Auditor)
**Escopo:** Repositório Completo

## Resumo Executivo

A auditoria identificou **7 vulnerabilidades**, sendo **2 de nível Crítico** e **2 de nível Alto**.
As falhas mais graves comprometem fundamentalmente a integridade dos pagamentos, permitindo que atacantes falsifiquem confirmações de pagamento (spoofing) e exponham credenciais sensíveis.
Recomenda-se a suspensão imediata do uso deste SDK em ambiente de produção até que as falhas críticas sejam corrigidas.

---

## Detalhamento das Vulnerabilidades

### 1. Webhooks Iniciados pelo Cliente (Client-Side)
*   **Severidade:** 🔴 **Crítico**
*   **Localização:** `src/core/webhookManager.ts`, `src/core/webhookClient.ts`, `src/core/createPaymentSession.ts`
*   **Descrição:** O SDK foi arquitetado para disparar webhooks a partir do navegador do cliente (frontend) diretamente para o backend do lojista.
*   **Impacto:**
    *   **Perda de Fundos:** Um atacante pode inspecionar o código do frontend, extrair a URL do webhook e (se houver) a chave de assinatura.
    *   **Spoofing:** O atacante pode enviar requisições falsas de `payment.confirmed` para o backend do lojista sem realizar nenhum pagamento na blockchain. Como o evento se origina de um ambiente não confiável (o navegador do usuário), o backend não tem como garantir sua veracidade apenas recebendo o request.
*   **Correção:**
    *   Remover toda a lógica de disparo de webhooks do cliente.
    *   Implementar a verificação de pagamentos exclusivamente no Backend, monitorando a blockchain (via Horizon ou RPC) para confirmar se a transação com o Memo/ID correto foi efetivada na conta de destino.

### 2. Assinatura HMAC Falsa (Broken Cryptography)
*   **Severidade:** 🔴 **Crítico**
*   **Localização:** `src/core/webhookClient.ts` (Linha ~85, método `createHmacSignature`)
*   **Descrição:** O método responsável por gerar a assinatura de segurança dos webhooks não implementa o algoritmo HMAC. Ele apenas converte o payload para Base64, ignorando completamente a chave secreta (`secret`).
    ```typescript
    // Código vulnerável encontrado
    private createHmacSignature(payload: string): string {
      // ...
      return btoa(String.fromCharCode(...messageData)); // Placeholder
    }
    ```
*   **Impacto:**
    *   Qualquer pessoa pode forjar uma assinatura válida, pois basta codificar o corpo da requisição em Base64. Isso anula qualquer proteção que a assinatura deveria fornecer.
*   **Correção:**
    *   Implementar HMAC-SHA256 utilizando `crypto.subtle` (Web API) ou o módulo `crypto` (Node.js).

### 3. Exposição de Segredos em Build Artifacts
*   **Severidade:** 🟠 **Alto**
*   **Localização:** `examples/.next/cache/webpack/...`, `sandbox.mjs`
*   **Descrição:** O repositório contém artefatos de build (`.next`) commitados que possuem chaves privadas ou tokens embutidos ("Potential Stellar Secret Key"). Além disso, o arquivo `sandbox.mjs` e exemplos incentivam o uso de secrets no código.
*   **Impacto:**
    *   Vazamento de chaves privadas de carteiras Stellar ou chaves de API. Se essas carteiras tiverem fundos, eles serão drenados.
*   **Correção:**
    *   Remover imediatamente o diretório `examples/.next` do git.
    *   Adicionar `.next` ao `.gitignore` de todos os subprojetos.
    *   Rotacionar (revogar e gerar novas) quaisquer chaves que estavam presentes nesses arquivos.

### 4. Hardcoded Testnet & DoS na Mainnet
*   **Severidade:** 🟠 **Alto**
*   **Localização:** `src/core/createPaymentSession.ts`, `src/core/signAndSubmit.ts`
*   **Descrição:** As URLs do Horizon e a `networkPassphrase` estão fixadas para a Testnet (`https://horizon-testnet.stellar.org`, `Networks.TESTNET`), mesmo que o componente `PayWithUSDC` receba uma prop `network`.
*   **Impacto:**
    *   O SDK não funciona na Mainnet (Public Network).
    *   Se um desenvolvedor configurar o SDK para produção, as transações serão criadas para a Testnet. Se enviadas para a rede pública, falharão (assinatura inválida). Isso causa negação de serviço e possível confusão financeira.
*   **Correção:**
    *   Parametrizar a URL do Horizon e a Passphrase nos métodos `createPaymentSession` e `signAndSubmit`.

### 5. Validação Insuficiente de Inputs
*   **Severidade:** 🟡 **Médio**
*   **Localização:** `src/core/createPaymentSession.ts`
*   **Descrição:** Não há validação para impedir valores negativos ou zero no campo `amount`.
*   **Impacto:**
    *   Comportamento indefinido ou erros na transação Stellar. Embora a rede Stellar rejeite valores negativos, a validação deve ocorrer antes, no SDK.
*   **Correção:**
    *   Adicionar validação: `if (req.amount <= 0) throw new Error("Amount must be positive");`.

---

## Outras Observações

*   **Dependências:** O projeto usa versões "futuras" ou instáveis de React (`^19.2.0`) e TypeScript (`^5.9.3`), o que pode indicar um ambiente de desenvolvimento mal configurado ou erros de digitação.
*   **Testes:** O projeto não possui testes automatizados (`"test": "echo \"(sem testes ainda)\"`), o que dificulta a garantia de segurança e estabilidade.

## Conclusão

O código atual é **inseguro para uso em produção**. A arquitetura de validação de pagamentos precisa ser redesenhada para não depender do cliente (frontend), e a criptografia deve ser corrigida imediatamente.
