package br.com.evandrosgrill.service;

import br.com.evandrosgrill.exception.RecursoNaoEncontradoException;
import br.com.evandrosgrill.exception.RegraNegocioException;
import br.com.evandrosgrill.model.entity.Configuracao;
import br.com.evandrosgrill.model.entity.MovimentoReserva;
import br.com.evandrosgrill.model.enums.Finalidade;
import br.com.evandrosgrill.model.enums.TipoMovimento;
import br.com.evandrosgrill.model.request.MovimentoReservaRequest;
import br.com.evandrosgrill.model.response.MovimentoReservaResponse;
import br.com.evandrosgrill.model.response.ReservaResumoResponse;
import br.com.evandrosgrill.repository.MovimentoReservaRepository;
import br.com.evandrosgrill.repository.UsuarioRepository;
import br.com.evandrosgrill.util.Relogio;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class MovimentoReservaService {

    private static final BigDecimal CEM = new BigDecimal("100");

    private final MovimentoReservaRepository movimentoReservaRepository;
    private final UsuarioRepository usuarioRepository;
    private final ConfiguracaoService configuracaoService;

    // Histórico do mais recente para o mais antigo, cada linha com o saldo depois do movimento.
    // tipo é opcional (abas "Todas", "Entradas" e "Saídas"); o saldo mostrado é sempre o geral.
    @Transactional(readOnly = true)
    public List<MovimentoReservaResponse> listar(Long usuarioId, TipoMovimento tipo) {
        List<MovimentoReserva> movimentos = movimentoReservaRepository.findByUsuarioIdOrderByDataDescIdDesc(usuarioId);

        // Percorre do mais antigo para o mais novo acumulando o saldo
        Map<Long, BigDecimal> saldoApos = new HashMap<>();
        BigDecimal saldo = BigDecimal.ZERO;
        for (int i = movimentos.size() - 1; i >= 0; i--) {
            MovimentoReserva m = movimentos.get(i);
            saldo = (m.getTipo() == TipoMovimento.ENTRADA) ? saldo.add(m.getValor()) : saldo.subtract(m.getValor());
            saldoApos.put(m.getId(), saldo);
        }

        return movimentos.stream()
                .filter(m -> tipo == null || m.getTipo() == tipo)
                .map(m -> MovimentoReservaResponse.de(m, saldoApos.get(m.getId())))
                .toList();
    }

    // Cards da tela Reserva para o mês escolhido (sem mês, usa o atual)
    @Transactional
    public ReservaResumoResponse resumo(Long usuarioId, YearMonth mes) {
        YearMonth alvo = (mes != null) ? mes : YearMonth.from(Relogio.hoje());
        LocalDate inicio = alvo.atDay(1);
        LocalDate fim = alvo.atEndOfMonth();

        BigDecimal saldo = movimentoReservaRepository.calcularSaldoAte(usuarioId, fim);
        BigDecimal saldoMesAnterior = movimentoReservaRepository.calcularSaldoAte(usuarioId, inicio.minusDays(1));
        BigDecimal entrou = movimentoReservaRepository.somarPorTipoNoPeriodo(usuarioId, TipoMovimento.ENTRADA, inicio, fim);
        BigDecimal saiu = movimentoReservaRepository.somarPorTipoNoPeriodo(usuarioId, TipoMovimento.SAIDA, inicio, fim);

        Configuracao config = configuracaoService.obterOuCriar(usuarioId);
        BigDecimal meta = config.getMetaReserva();

        BigDecimal percentualMeta = null;
        BigDecimal faltaParaMeta = null;
        if (meta != null && meta.signum() > 0) {
            percentualMeta = saldo.multiply(CEM).divide(meta, 0, RoundingMode.HALF_UP);
            faltaParaMeta = meta.subtract(saldo).max(BigDecimal.ZERO);
        }

        return new ReservaResumoResponse(saldo, entrou, saiu, saldoMesAnterior, meta, percentualMeta, faltaParaMeta);
    }

    // "Guardar valor" (ENTRADA) e "Registrar saída" (SAIDA)
    @Transactional
    public MovimentoReservaResponse registrar(Long usuarioId, MovimentoReservaRequest request) {
        LocalDate data = (request.data() != null) ? request.data() : Relogio.hoje();
        Finalidade finalidade = null;

        if (request.tipo() == TipoMovimento.SAIDA) {
            if (request.finalidade() == null) {
                throw new RegraNegocioException("Informe a finalidade da saída: emergência ou investimento");
            }
            BigDecimal saldo = movimentoReservaRepository.calcularSaldo(usuarioId);
            if (request.valor().compareTo(saldo) > 0) {
                throw new RegraNegocioException("A saída é maior que o saldo da reserva (R$ " + saldo + ")");
            }
            finalidade = request.finalidade();
        }

        MovimentoReserva movimento = new MovimentoReserva();
        movimento.setUsuario(usuarioRepository.getReferenceById(usuarioId));
        movimento.setData(data);
        movimento.setTipo(request.tipo());
        movimento.setFinalidade(finalidade);
        movimento.setDescricao(request.descricao().trim());
        movimento.setValor(request.valor());
        MovimentoReserva salvo = movimentoReservaRepository.save(movimento);

        BigDecimal saldoApos = movimentoReservaRepository.calcularSaldoAte(usuarioId, data);
        return MovimentoReservaResponse.de(salvo, saldoApos);
    }

    @Transactional
    public void excluir(Long usuarioId, Long id) {
        MovimentoReserva movimento = movimentoReservaRepository.findByIdAndUsuarioId(id, usuarioId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Movimento não encontrado"));

        // A entrada de um fechamento acompanha o fechamento do dia
        if (movimento.getFechamentoDiario() != null) {
            throw new RegraNegocioException("Este movimento foi gerado por um fechamento diário e não pode ser excluído");
        }

        // Excluir uma entrada não pode deixar a reserva negativa
        if (movimento.getTipo() == TipoMovimento.ENTRADA) {
            BigDecimal saldo = movimentoReservaRepository.calcularSaldo(usuarioId);
            if (saldo.subtract(movimento.getValor()).signum() < 0) {
                throw new RegraNegocioException("Excluir esta entrada deixaria o saldo da reserva negativo");
            }
        }

        movimentoReservaRepository.delete(movimento);
    }
}
