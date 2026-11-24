package br.com.evandrosgrill.model.response;

// Resposta do login: o JWT e os dados do usuário.
public record LoginResponse(String token, UsuarioResponse usuario) {
}
