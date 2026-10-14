package br.com.evandrosgrill.controller;

import br.com.evandrosgrill.model.request.ConfiguracaoRequest;
import br.com.evandrosgrill.model.response.ConfiguracaoResponse;
import br.com.evandrosgrill.service.ConfiguracaoService;
import br.com.evandrosgrill.util.Autenticacao;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/configuracao")
@RequiredArgsConstructor
public class ConfiguracaoController {

    private final ConfiguracaoService configuracaoService;

    @GetMapping
    public ConfiguracaoResponse buscar(@AuthenticationPrincipal Jwt jwt) {
        return configuracaoService.buscar(Autenticacao.usuarioId(jwt));
    }

    // "Salvar alterações"
    @PutMapping
    public ConfiguracaoResponse atualizar(@AuthenticationPrincipal Jwt jwt,
                                          @Valid @RequestBody ConfiguracaoRequest request) {
        return configuracaoService.atualizar(Autenticacao.usuarioId(jwt), request);
    }
}
