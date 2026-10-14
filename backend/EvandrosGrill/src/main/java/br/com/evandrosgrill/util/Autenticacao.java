package br.com.evandrosgrill.util;

import org.springframework.security.oauth2.jwt.Jwt;

// Pega o id do usuário logado a partir do token (o "subject" do JWT guarda o id)
public final class Autenticacao {

    private Autenticacao() {
    }

    public static Long usuarioId(Jwt jwt) {
        return Long.valueOf(jwt.getSubject());
    }
}
