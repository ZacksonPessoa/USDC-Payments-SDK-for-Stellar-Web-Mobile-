# 🔗 Webhook Support - USDC Payments SDK

O sistema de webhooks permite que aplicações backend recebam notificações automáticas sobre eventos de pagamento em tempo real.

## 🎯 Funcionalidades

- **Notificações Automáticas**: Eventos HTTP enviados para URLs configuradas
- **Retry Automático**: Tentativas de reenvio com backoff exponencial
- **Assinatura HMAC**: Validação de integridade dos webhooks
- **Processamento Assíncrono**: Não bloqueia o fluxo principal
- **Múltiplos Webhooks**: Suporte a vários endpoints simultaneamente

## 📋 Eventos Suportados

| Evento | Descrição | Quando é Emitido |
|--------|-----------|------------------|
| `payment.created` | Sessão de pagamento criada | Quando `createPaymentSession()` é chamado |
| `payment.submitted` | Transação enviada para Horizon | Quando `signAndSubmit()` envia a transação |
| `payment.confirmed` | Transação confirmada na blockchain | Quando Horizon confirma a transação |
| `payment.failed` | Transação falhou | Quando ocorre erro na transação |
| `payment.expired` | Sessão expirou | Quando uma sessão expira (futuro) |

## 🚀 Uso Básico

### 1. Configurar Webhook

```typescript
import { webhookManager } from '@zacksonpessoa/usdc-payments-sdk';

// Registrar webhook
webhookManager.registerWebhook("merchant-backend", {
  url: "https://api.merchant.com/webhooks/stellar-payments",
  secret: "your-webhook-secret",
  retryAttempts: 5,
  timeout: 10000
});
```

### 2. Usar SDK Normalmente

```typescript
import { createPaymentSession, signAndSubmit } from '@zacksonpessoa/usdc-payments-sdk';

// Criar sessão (emite payment.created)
const session = await createPaymentSession({
  amount: 50,
  assetCode: "USDC",
  issuer: "GADGV62S2PRYD4HGRB3DPSYRH64X2EXMNPPTELVD4EKJ6LFL76STFGSL",
  destination: "GDESTINATIONADDRESS...",
  memo: "Order #123"
});

// Enviar transação (emite payment.submitted e payment.confirmed)
const result = await signAndSubmit(
  session.xdr, 
  "S...SECRETKEY",
  session.id,
  session.request
);
```

## 📨 Formato do Payload

```json
{
  "id": "evt_1703123456789_abc123def",
  "type": "payment.confirmed",
  "timestamp": "2023-12-21T10:30:45.123Z",
  "sessionId": "session-1703123456789",
  "transactionHash": "abc123def456...",
  "paymentRequest": {
    "amount": 50,
    "assetCode": "USDC",
    "issuer": "GADGV62S2PRYD4HGRB3DPSYRH64X2EXMNPPTELVD4EKJ6LFL76STFGSL",
    "destination": "GDESTINATIONADDRESS...",
    "memo": "Order #123"
  },
  "metadata": {
    "confirmedAt": "2023-12-21T10:30:45.123Z"
  }
}
```

## 🔒 Segurança

### Assinatura HMAC

O SDK inclui assinatura HMAC para validar a integridade dos webhooks:

```typescript
// Configurar secret
webhookManager.registerWebhook("secure-webhook", {
  url: "https://api.merchant.com/webhooks",
  secret: "your-secret-key"
});
```

### Validação no Backend

```javascript
// Exemplo de validação em Node.js
const crypto = require('crypto');

function validateWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return signature === `sha256=${expectedSignature}`;
}
```

## 🛠️ Configuração Avançada

### Múltiplos Webhooks

```typescript
// Webhook para auditoria
webhookManager.registerWebhook("audit-log", {
  url: "https://audit.example.com/webhooks",
  secret: "audit-secret"
});

// Webhook para notificações
webhookManager.registerWebhook("notifications", {
  url: "https://notifications.example.com/webhooks",
  secret: "notification-secret"
});
```

### Configurações Personalizadas

```typescript
webhookManager.registerWebhook("custom-webhook", {
  url: "https://api.example.com/webhooks",
  secret: "custom-secret",
  retryAttempts: 10,    // 10 tentativas
  timeout: 30000         // 30 segundos de timeout
});
```

## 📊 Monitoramento

### Estatísticas

```typescript
const stats = webhookManager.getStats();
console.log("Webhooks registrados:", stats.registeredWebhooks);
console.log("Eventos na fila:", stats.queuedEvents);
```

### Logs de Debug

```typescript
// Os webhooks incluem logs automáticos
console.log("Webhook delivery failed:", error);
```

## 🧪 Testando

### Exemplo Completo

```bash
npm run test:webhook
```

### Servidor de Teste

Use ferramentas como [webhook.site](https://webhook.site) para testar:

```typescript
webhookManager.registerWebhook("test-webhook", {
  url: "https://webhook.site/your-unique-url",
  secret: "test-secret"
});
```

## 🔧 Implementação no Backend

### Express.js

```javascript
const express = require('express');
const crypto = require('crypto');
const app = express();

app.use(express.json());

app.post('/webhooks/stellar-payments', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = JSON.stringify(req.body);
  
  // Validar assinatura
  if (!validateWebhookSignature(payload, signature, process.env.WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }
  
  const { type, sessionId, paymentRequest, transactionHash } = req.body;
  
  switch (type) {
    case 'payment.created':
      console.log('Payment session created:', sessionId);
      break;
    case 'payment.submitted':
      console.log('Payment submitted:', transactionHash);
      break;
    case 'payment.confirmed':
      console.log('Payment confirmed:', transactionHash);
      // Atualizar status do pedido
      updateOrderStatus(paymentRequest.memo, 'paid');
      break;
    case 'payment.failed':
      console.log('Payment failed:', req.body.metadata.error);
      break;
  }
  
  res.status(200).send('OK');
});
```

## 🚨 Tratamento de Erros

### Retry Automático

O SDK automaticamente:
- Tenta reenviar webhooks que falharam
- Usa backoff exponencial (1s, 2s, 4s, 8s...)
- Para após o número máximo de tentativas

### Logs de Erro

```typescript
// Erros são automaticamente logados
console.error("Webhook delivery failed:", error);
```

## 📈 Performance

- **Processamento Assíncrono**: Webhooks não bloqueiam transações
- **Fila de Eventos**: Eventos são processados em background
- **Retry Inteligente**: Evita spam de tentativas
- **Timeout Configurável**: Evita travamentos

## 🔮 Roadmap

- [ ] Webhook para `payment.expired`
- [ ] Filtros de eventos por tipo
- [ ] Métricas de entrega
- [ ] Dashboard de monitoramento
- [ ] Webhook para eventos de carteira

---

**O sistema de webhooks está totalmente integrado ao SDK e pronto para uso em produção!** 🚀
