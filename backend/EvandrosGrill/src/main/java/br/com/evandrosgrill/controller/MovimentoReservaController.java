package br.com.evandrosgrill.controller;

import br.com.evandrosgrill.model.enums.TipoMovimento;
import br.com.evandrosgrill.model.request.MovimentoReservaRequest;
import br.com.evandrosgrill.model.response.MovimentoReservaResponse;
import br.com.evandrosgrill.model.response.ReservaResumoResponse;
import br.com.evandrosgrill.service.MovimentoReservaService;
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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.YearMonth;
import java.util.List;

@RestController
@RequestMapping("/api/reserva")
@RequiredArgsConstructor
public class MovimentoReservaController {

    private final MovimentoReservaService movimentoReservaService;

    // Abas Todas / Entradas / Saídas: ?tipo=ENTRADA ou ?tipo=SAIDA (sem o parâmetro, traz todas)
    @GetMapping("/movimentos")
    public List<MovimentoReservaResponse> listar(@AuthenticationPrincipal Jwt jwt,
                                                 @RequestParam(name = "tipo", required = false) TipoMovimento tipo) {
        return movimentoReservaService.listar(Autenticacao.usuarioId(jwt), tipo);
    }

    // Cards da tela Reserva: ?mes=2026-10 (sem mês, usa o atual)
    @GetMapping("/resumo")
    public ReservaResumoResponse resumo(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(name = "mes", required = false) @DateTimeFormat(pattern = "yyyy-MM") YearMonth mes) {
        return movimentoReservaService.resumo(Autenticacao.usuarioId(jwt), mes);
    }

    // "Guardar valor" (ENTRADA) e "Registrar saída" (SAIDA)
    @PostMapping("/movimentos")
    @ResponseStatus(HttpStatus.CREATED)
    public MovimentoReservaResponse registrar(@AuthenticationPrincipal Jwt jwt,
                                              @Valid @RequestBody MovimentoReservaRequest request) {
        return movimentoReservaService.registrar(Autenticacao.usuarioId(jwt), request);
    }

    @DeleteMapping("/movimentos/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void excluir(@AuthenticationPrincipal Jwt jwt, @PathVariable("id") Long id) {
        movimentoReservaService.excluir(Autenticacao.usuarioId(jwt), id);
    }
}
