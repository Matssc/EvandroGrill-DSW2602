package br.com.evandrosgrill.controller;

import br.com.evandrosgrill.model.request.CartaoPjRequest;
import br.com.evandrosgrill.model.response.CartaoPjResponse;
import br.com.evandrosgrill.service.CartaoPjService;
import br.com.evandrosgrill.util.Autenticacao;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/cartoes")
@RequiredArgsConstructor
public class CartaoPjController {

    private final CartaoPjService cartaoPjService;

    // ?apenasAtivos=true traz só os cartões do formulário de compra
    @GetMapping
    public List<CartaoPjResponse> listar(@AuthenticationPrincipal Jwt jwt,
                                         @RequestParam(name = "apenasAtivos", defaultValue = "false") boolean apenasAtivos) {
        return cartaoPjService.listar(Autenticacao.usuarioId(jwt), apenasAtivos);
    }

    @GetMapping("/{id}")
    public CartaoPjResponse buscar(@AuthenticationPrincipal Jwt jwt, @PathVariable("id") Long id) {
        return cartaoPjService.buscar(Autenticacao.usuarioId(jwt), id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CartaoPjResponse criar(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CartaoPjRequest request) {
        return cartaoPjService.criar(Autenticacao.usuarioId(jwt), request);
    }

    @PutMapping("/{id}")
    public CartaoPjResponse atualizar(@AuthenticationPrincipal Jwt jwt, @PathVariable("id") Long id,
                                      @Valid @RequestBody CartaoPjRequest request) {
        return cartaoPjService.atualizar(Autenticacao.usuarioId(jwt), id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void excluir(@AuthenticationPrincipal Jwt jwt, @PathVariable("id") Long id) {
        cartaoPjService.excluir(Autenticacao.usuarioId(jwt), id);
    }
}
