package br.com.evandrosgrill.controller;

import br.com.evandrosgrill.model.request.TrocarSenhaRequest;
import br.com.evandrosgrill.model.response.UsuarioResponse;
import br.com.evandrosgrill.service.UsuarioService;
import br.com.evandrosgrill.util.Autenticacao;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/usuario")
@RequiredArgsConstructor
public class UsuarioController {

    private final UsuarioService usuarioService;

    // Dados de quem está logado (nome no menu lateral, e-mail em Configurações)
    @GetMapping("/me")
    public UsuarioResponse meusDados(@AuthenticationPrincipal Jwt jwt) {
        return usuarioService.buscar(Autenticacao.usuarioId(jwt));
    }

    @PutMapping("/senha")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void trocarSenha(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody TrocarSenhaRequest request) {
        usuarioService.trocarSenha(Autenticacao.usuarioId(jwt), request);
    }
}
