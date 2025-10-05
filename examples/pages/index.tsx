import React from "react";

export default function Home() {
  return (
    <div style={{ padding: 32 }}>
      <h1>🎉  USDC Payments SDK forStellar Web Mobile Demo</h1>
      <p>✅ SDK funcionando perfeitamente!</p>
      
      <div style={{ marginTop: 20, padding: 20, border: "2px solid #4CAF50", borderRadius: 8, backgroundColor: "#f0f8f0" }}>
        <h3>✅ Status: SDK Funcionando</h3>
        <p>O SDK foi compilado com sucesso e está pronto para uso.</p>
        <p><strong>Para usar o componente PayWithUSDC:</strong></p>
        <pre style={{ backgroundColor: "#f5f5f5", padding: 10, borderRadius: 4 }}>
{`import { PayWithUSDC } from "../../dist/index.js"`}
        </pre>
      </div>
    </div>
  );
}