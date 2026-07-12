import { createPaymentSession, signAndSubmit, PayWithUSDC } from "./dist/index.js";
import * as StellarSDK from "stellar-sdk";

const run = async () => {
  // 1) Criar uma conta na testnet usando Friendbot
  const keypair = StellarSDK.Keypair.random();
  console.log("Criando conta na testnet...");
  console.log("Public Key:", keypair.publicKey());
  console.log("Secret Key:", keypair.secret());
  
  try {
    // Usar Friendbot via HTTP direto
    const response = await fetch(`https://friendbot.stellar.org/?addr=${keypair.publicKey()}`);
    if (response.ok) {
      console.log("✅ Conta criada com sucesso na testnet!");
    } else {
      throw new Error("Friendbot falhou");
    }
  } catch (error) {
    console.log("⚠️ Erro ao criar conta:", error.message);
    console.log("Continuando com a conta existente...");
  }

  // 2) Criar sessão de pagamento usando a conta criada
  const session = await createPaymentSession({
    amount: 1, // Reduzir para 1 XLM
    assetCode: "XLM",
    issuer: "", // XLM é nativo, não tem issuer
    destination: keypair.publicKey(), // Enviar para a própria conta (sempre funciona)
    memo: "demo"
  }, keypair.publicKey());
  console.log("XDR ok, enviado...");
  
  // 3) Assinar e enviar transação
  const res = await signAndSubmit(session.xdr, keypair.secret());
  console.log("Transação enviada com sucesso:", res.hash);
  
  console.log("session id:", session.id);
  console.log("xdr length:", session.xdr.length);
  console.log("xdr (inicio):", session.xdr.slice(0, 40) + "...");
  
  // 4) Mock de uso do componente PayWithUSDC
  console.log("\n=== MOCK DE USO DO COMPONENTE PayWithUSDC ===");
  
  // Mock de props que seriam passadas para o componente
  const mockProps = {
    amount: 5,
    destination: "GBVXCZW2O2NMVRJ52HBJ6EAC2MEQM6A6I3MPFO6C3C2QIHBK6JJ5KRSE",
    source: keypair.publicKey(),
    getSecret: async () => keypair.secret(), // ⚠️ DEV ONLY - função que retorna a chave secreta
    assetCode: "USDC",
    issuer: "GADGV62S2PRYD4HGRB3DPSYRH64X2EXMNPPTELVD4EKJ6LFL76STFGSL",
    memo: "Pagamento via SDK",
    label: "Pagar",
    onSuccess: (hash) => console.log("✅ Pagamento realizado com sucesso! Hash:", hash),
    onError: (error) => console.error("❌ Erro no pagamento:", error)
  };
  
  console.log("Props do componente PayWithUSDC:");
  console.log("- amount:", mockProps.amount);
  console.log("- destination:", mockProps.destination);
  console.log("- source:", mockProps.source);
  console.log("- assetCode:", mockProps.assetCode);
  console.log("- issuer:", mockProps.issuer);
  console.log("- memo:", mockProps.memo);
  console.log("- label:", mockProps.label);
  console.log("- getSecret: [função que retorna chave secreta]");
  console.log("- onSuccess: [callback de sucesso]");
  console.log("- onError: [callback de erro]");
  
  console.log("\nExemplo de uso em React:");
  console.log(`
<PayWithUSDC
  amount={${mockProps.amount}}
  destination="${mockProps.destination}"
  source="${mockProps.source}"
  getSecret={async () => "S...SUA_CHAVE_SECRETA"}
  assetCode="${mockProps.assetCode}"
  issuer="${mockProps.issuer}"
  memo="${mockProps.memo}"
  label="${mockProps.label}"
  onSuccess={(hash) => console.log("Sucesso:", hash)}
  onError={(error) => console.error("Erro:", error)}
/>
  `);
  
  console.log("=== FIM DO MOCK ===");
};

run().catch(console.error);
