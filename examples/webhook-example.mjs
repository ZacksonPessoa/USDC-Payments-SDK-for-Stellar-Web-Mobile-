import { webhookManager, createPaymentSession, signAndSubmit } from "../dist/index.js";
import * as StellarSDK from "stellar-sdk";

async function webhookExample() {
  console.log("🚀 Iniciando exemplo de webhooks...\n");

  // Configura webhook para um backend de exemplo
  webhookManager.registerWebhook("merchant-backend", {
    url: "https://webhook.site/your-unique-url", // Substitua por sua URL real
    secret: "your-webhook-secret-key",
    retryAttempts: 3,
    timeout: 10000
  });

  console.log("✅ Webhook registrado com sucesso!");
  console.log("📊 Estatísticas:", webhookManager.getStats());

  // Criar uma conta de teste
  const keypair = StellarSDK.Keypair.random();
  console.log("\n🔑 Criando conta de teste...");
  console.log("Public Key:", keypair.publicKey());

  try {
    // Fundar conta via Friendbot
    const response = await fetch(`https://friendbot.stellar.org/?addr=${keypair.publicKey()}`);
    if (response.ok) {
      console.log("✅ Conta financiada com sucesso!");
    }
  } catch (error) {
    console.log("⚠️ Erro ao financiar conta:", error);
  }

  // Criar sessão de pagamento (emite payment.created)
  console.log("\n💳 Criando sessão de pagamento...");
  const session = await createPaymentSession({
    amount: 1,
    assetCode: "XLM",
    destination: keypair.publicKey(), // Enviar para a própria conta (sempre funciona)
    memo: "Webhook Test Payment"
  }, keypair.publicKey());

  console.log("✅ Sessão criada:", session.id);
  console.log("📊 Estatísticas após criação:", webhookManager.getStats());

  // Simular eventos de webhook sem enviar transação real
  console.log("\n📤 Simulando eventos de webhook...");
  
  // Simular payment.submitted
  await webhookManager.emitPaymentSubmitted(session.id, session.request, "pending");
  console.log("✅ Evento payment.submitted emitido");
  
  // Simular payment.confirmed
  await webhookManager.emitPaymentConfirmed(session.id, session.request, "abc123def456...");
  console.log("✅ Evento payment.confirmed emitido");

  console.log("📊 Estatísticas finais:", webhookManager.getStats());

  console.log("\n🎉 Exemplo de webhook concluído!");
  console.log("\n📋 Eventos enviados:");
  console.log("1. payment.created - Quando a sessão foi criada");
  console.log("2. payment.submitted - Simulado");
  console.log("3. payment.confirmed - Simulado");
}

// Função para demonstrar diferentes tipos de webhook
async function demonstrateWebhookTypes() {
  console.log("\n🔧 Demonstração de tipos de webhook:");
  
  // Registrar webhook para diferentes eventos
  webhookManager.registerWebhook("audit-log", {
    url: "https://audit.example.com/webhooks",
    secret: "audit-secret"
  });

  webhookManager.registerWebhook("notification-service", {
    url: "https://notifications.example.com/webhooks",
    secret: "notification-secret"
  });

  console.log("📊 Webhooks registrados:", webhookManager.getStats());
}

// Executar exemplo
webhookExample()
  .then(() => demonstrateWebhookTypes())
  .catch(console.error);
