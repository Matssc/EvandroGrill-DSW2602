package br.com.evandrosgrill.model.response;

import br.com.evandrosgrill.model.entity.Usuario;

// Nunca devolve a senha (nem o hash)
public record UsuarioResponse(Long id, String nome, String nomeNegocio, String email) {

    public static UsuarioResponse de(Usuario u) {
        return new UsuarioResponse(u.getId(), u.getNome(), u.getNomeNegocio(), u.getEmail());
    }
}
