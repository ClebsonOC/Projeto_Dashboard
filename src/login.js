// js/login.js
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const errorMessageDiv = document.getElementById("loginErrorMessage");

  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault(); 

      const usernameInput = document.getElementById("username");
      const passwordInput = document.getElementById("password");
      
      const username = usernameInput.value;
      const password = passwordInput.value;

      errorMessageDiv.style.display = "none"; 
      errorMessageDiv.textContent = "";

      if (!username || !password) {
        errorMessageDiv.textContent = "Por favor, preencha usuário e senha.";
        errorMessageDiv.style.display = "block";
        return;
      }

      try {
        const response = await fetch("/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username, password }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
          // Login bem-sucedido
          // MODIFICADO: Usa result.redirectTo se disponível, senão usa '/'
          window.location.href = result.redirectTo || "/"; 
        } else {
          errorMessageDiv.textContent =
            result.message || "Falha no login. Verifique suas credenciais.";
          errorMessageDiv.style.display = "block";
        }
      } catch (error) {
        console.error("Erro ao tentar fazer login:", error);
        errorMessageDiv.textContent =
          "Ocorreu um erro ao tentar fazer login. Tente novamente.";
        errorMessageDiv.style.display = "block";
      }
    });
  }
});