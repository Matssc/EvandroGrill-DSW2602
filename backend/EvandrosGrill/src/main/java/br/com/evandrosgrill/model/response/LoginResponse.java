package br.com.evandrosgrill.model.response;

public record LoginResponse(String token, UsuarioResponse usuario) {
}
