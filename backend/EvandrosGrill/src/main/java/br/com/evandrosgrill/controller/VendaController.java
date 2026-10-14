package br.com.evandrosgrill.controller;

import br.com.evandrosgrill.model.request.VendaRequest;
import br.com.evandrosgrill.model.response.MaisVendidoResponse;
import br.com.evandrosgrill.model.response.VendaResponse;
import br.com.evandrosgrill.model.response.VendasDoDiaResponse;
import br.com.evandrosgrill.service.VendaService;
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

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/vendas")
@RequiredArgsConstructor
public class VendaController {

    private final VendaService vendaService;

    // ?data=2026-10-08 (sem data, usa hoje)
    @GetMapping
    public List<VendaResponse> listarDoDia(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(name = "data", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate data) {
        return vendaService.listarDoDia(Autenticacao.usuarioId(jwt), data);
    }

    // Total, ticket médio e "Hoje por pagamento"
    @GetMapping("/resumo")
    public VendasDoDiaResponse resumoDoDia(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(name = "data", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate data) {
        return vendaService.resumoDoDia(Autenticacao.usuarioId(jwt), data);
    }

    // Ranking dos produtos: ?inicio=2026-10-01&fim=2026-10-31 (sem datas, o dia de hoje)
    @GetMapping("/mais-vendidos")
    public List<MaisVendidoResponse> maisVendidos(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(name = "inicio", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam(name = "fim", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fim) {
        return vendaService.maisVendidos(Autenticacao.usuarioId(jwt), inicio, fim);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public VendaResponse registrar(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody VendaRequest request) {
        return vendaService.registrar(Autenticacao.usuarioId(jwt), request);
    }

    @PutMapping("/{id}")
    public VendaResponse atualizar(@AuthenticationPrincipal Jwt jwt, @PathVariable("id") Long id,
                                   @Valid @RequestBody VendaRequest request) {
        return vendaService.atualizar(Autenticacao.usuarioId(jwt), id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void excluir(@AuthenticationPrincipal Jwt jwt, @PathVariable("id") Long id) {
        vendaService.excluir(Autenticacao.usuarioId(jwt), id);
    }
}
