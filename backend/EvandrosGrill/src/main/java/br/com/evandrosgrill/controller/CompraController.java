package br.com.evandrosgrill.controller;

import br.com.evandrosgrill.model.enums.FormaPagamentoCompra;
import br.com.evandrosgrill.model.request.CompraRequest;
import br.com.evandrosgrill.model.response.CompraResponse;
import br.com.evandrosgrill.model.response.ComprasResumoResponse;
import br.com.evandrosgrill.service.CompraService;
import br.com.evandrosgrill.util.Autenticacao;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
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

import java.time.YearMonth;
import java.util.List;

@RestController
@RequestMapping("/api/compras")
@RequiredArgsConstructor
public class CompraController {

    private final CompraService compraService;

    // Tela Compras. Todos os parâmetros são opcionais:
    // ?mes=2026-10  ?cartaoPjId=1  ?formaPagamento=A_VISTA  ?busca=carne
    @GetMapping
    public List<CompraResponse> listar(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(name = "mes", required = false) @DateTimeFormat(pattern = "yyyy-MM") YearMonth mes,
            @RequestParam(name = "cartaoPjId", required = false) Long cartaoPjId,
            @RequestParam(name = "formaPagamento", required = false) FormaPagamentoCompra formaPagamento,
            @RequestParam(name = "busca", required = false) String busca) {
        return compraService.listar(Autenticacao.usuarioId(jwt), mes, cartaoPjId, formaPagamento, busca);
    }

    // Cards de topo, gasto por cartão, à vista e "Por categoria"
    @GetMapping("/resumo")
    public ComprasResumoResponse resumo(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(name = "mes", required = false) @DateTimeFormat(pattern = "yyyy-MM") YearMonth mes) {
        return compraService.resumo(Autenticacao.usuarioId(jwt), mes);
    }

    @GetMapping("/{id}")
    public CompraResponse buscar(@AuthenticationPrincipal Jwt jwt, @PathVariable("id") Long id) {
        return compraService.buscar(Autenticacao.usuarioId(jwt), id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CompraResponse criar(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CompraRequest request) {
        return compraService.criar(Autenticacao.usuarioId(jwt), request);
    }

    @PutMapping("/{id}")
    public CompraResponse atualizar(@AuthenticationPrincipal Jwt jwt, @PathVariable("id") Long id,
                                    @Valid @RequestBody CompraRequest request) {
        return compraService.atualizar(Autenticacao.usuarioId(jwt), id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void excluir(@AuthenticationPrincipal Jwt jwt, @PathVariable("id") Long id) {
        compraService.excluir(Autenticacao.usuarioId(jwt), id);
    }
}
