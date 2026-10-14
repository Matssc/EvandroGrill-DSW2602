package br.com.evandrosgrill.controller;

import br.com.evandrosgrill.model.enums.TipoCategoria;
import br.com.evandrosgrill.model.request.CategoriaRequest;
import br.com.evandrosgrill.model.response.CategoriaResponse;
import br.com.evandrosgrill.service.CategoriaService;
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
@RequestMapping("/api/categorias")
@RequiredArgsConstructor
public class CategoriaController {

    private final CategoriaService categoriaService;

    // ?tipo=COMPRA ou ?tipo=PRODUTO (sem o parâmetro, traz todas)
    @GetMapping
    public List<CategoriaResponse> listar(@AuthenticationPrincipal Jwt jwt,
                                          @RequestParam(name = "tipo", required = false) TipoCategoria tipo) {
        return categoriaService.listar(Autenticacao.usuarioId(jwt), tipo);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CategoriaResponse criar(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CategoriaRequest request) {
        return categoriaService.criar(Autenticacao.usuarioId(jwt), request);
    }

    @PutMapping("/{id}")
    public CategoriaResponse atualizar(@AuthenticationPrincipal Jwt jwt, @PathVariable("id") Long id,
                                       @Valid @RequestBody CategoriaRequest request) {
        return categoriaService.atualizar(Autenticacao.usuarioId(jwt), id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void excluir(@AuthenticationPrincipal Jwt jwt, @PathVariable("id") Long id) {
        categoriaService.excluir(Autenticacao.usuarioId(jwt), id);
    }
}
