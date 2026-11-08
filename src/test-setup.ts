// Preparação comum a todos os testes: cada teste começa com o armazenamento do navegador vazio,
// para treinos salvos e preferências de um teste não vazarem para o próximo.
beforeEach(() => {
  try {
    localStorage.clear();
  } catch {
    // Sem localStorage no ambiente de teste.
  }
});
