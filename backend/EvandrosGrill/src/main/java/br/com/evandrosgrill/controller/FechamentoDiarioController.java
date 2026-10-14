package br.com.evandrosgrill.controller;

import br.com.evandrosgrill.model.request.FecharDiaRequest;
import br.com.evandrosgrill.model.response.FechamentoDiarioResponse;
import br.com.evandrosgrill.model.response.PreviaFechamentoResponse;
import br.com.evandrosgrill.service.FechamentoDiarioService;
import br.com.evandrosgrill.util.Autenticacao;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

@RestController
@RequestMapping("/api/fechamentos")
@RequiredArgsConstructor
public class FechamentoDiarioController {

    private final FechamentoDiarioService fechamentoDiarioService;

    // Painel "Fechar o dia": mostra o cálculo antes de confirmar
    @GetMapping("/previa")
    public PreviaFechamentoResponse previa(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(name = "data", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate data) {
        return fechamentoDiarioService.previa(Autenticacao.usuarioId(jwt), data);
    }

    // "Confirmar fechamento"
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public FechamentoDiarioResponse fechar(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody FecharDiaRequest request) {
        return fechamentoDiarioService.fechar(Autenticacao.usuarioId(jwt), request);
    }

    // Fechamento de um dia: /api/fechamentos/dia?data=2026-10-07
    @GetMapping("/dia")
    public FechamentoDiarioResponse buscarPorData(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(name = "data") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate data) {
        return fechamentoDiarioService.buscarPorData(Autenticacao.usuarioId(jwt), data);
    }

    // Fechamentos do mês (tela Pró-labore): ?mes=2026-10 (sem mês, usa o atual)
    @GetMapping
    public List<FechamentoDiarioResponse> listarDoMes(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(name = "mes", required = false) @DateTimeFormat(pattern = "yyyy-MM") YearMonth mes) {
        return fechamentoDiarioService.listarDoMes(Autenticacao.usuarioId(jwt), mes);
    }
}
