package br.com.evandrosgrill.service;

import br.com.evandrosgrill.exception.RecursoNaoEncontradoException;
import br.com.evandrosgrill.exception.RegraNegocioException;
import br.com.evandrosgrill.model.entity.Configuracao;
import br.com.evandrosgrill.model.entity.FechamentoDiario;
import br.com.evandrosgrill.model.entity.MovimentoReserva;
import br.com.evandrosgrill.model.entity.Venda;
import br.com.evandrosgrill.model.enums.TipoMovimento;
import br.com.evandrosgrill.model.request.FecharDiaRequest;
import br.com.evandrosgrill.model.response.FechamentoDiarioResponse;
import br.com.evandrosgrill.model.response.PreviaFechamentoResponse;
import br.com.evandrosgrill.repository.FechamentoDiarioRepository;
import br.com.evandrosgrill.repository.MovimentoReservaRepository;
import br.com.evandrosgrill.repository.UsuarioRepository;
import br.com.evandrosgrill.repository.VendaRepository;
import br.com.evandrosgrill.util.Relogio;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
public class FechamentoDiarioService {

    private static final BigDecimal CEM = new BigDecimal("100");
    private static final DateTimeFormatter DIA_MES = DateTimeFormatter.ofPattern("dd/MM");
    private static final DateTimeFormatter DIA_MES_ANO = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final FechamentoDiarioRepository fechamentoDiarioRepository;
    private final VendaRepository vendaRepository;
    private final MovimentoReservaRepository movimentoReservaRepository;
    private final UsuarioRepository usuarioRepository;
    private final ConfiguracaoService configuracaoService;

    // Painel "Fechar o dia": mostra o cálculo antes de confirmar
    @Transactional
    public PreviaFechamentoResponse previa(Long usuarioId, LocalDate data) {
        LocalDate dia = (data != null) ? data : Relogio.hoje();

        Configuracao config = configuracaoService.obterOuCriar(usuarioId);
        BigDecimal total = vendaRepository.somarPorData(usuarioId, dia);
        Valores valores = calcular(total, config);

        // "Conta como o 7º dia trabalhado do mês": dias já fechados até a data, mais este se ainda estiver aberto
        long fechadosAteODia = fechamentoDiarioRepository.countByUsuarioIdAndDataBetween(
                usuarioId, dia.withDayOfMonth(1), dia);
        boolean jaFechado = fechamentoDiarioRepository.existsByUsuarioIdAndData(usuarioId, dia);
        long numeroDiaTrabalhado = jaFechado ? fechadosAteODia : fechadosAteODia + 1;

        boolean dividir = Boolean.TRUE.equals(config.getDividirRetirada());
        return new PreviaFechamentoResponse(
                dia,
                total,
                config.getPercentualRetirada(),
                valores.retirada(),
                dividir ? config.getPercentualSalario() : CEM,
                valores.salario(),
                valores.reserva(),
                valores.ficaNoCaixa(),
                numeroDiaTrabalhado);
    }

    // "Confirmar fechamento": grava o fechamento, trava as vendas do dia e manda a parte da reserva
    @Transactional
    public FechamentoDiarioResponse fechar(Long usuarioId, FecharDiaRequest request) {
        LocalDate dia = request.data();

        if (fechamentoDiarioRepository.existsByUsuarioIdAndData(usuarioId, dia)) {
            throw new RegraNegocioException("O dia " + dia.format(DIA_MES_ANO) + " já foi fechado");
        }

        List<Venda> vendas = vendaRepository.findByUsuarioIdAndDataAndFechamentoDiarioIsNull(usuarioId, dia);
        if (vendas.isEmpty()) {
            throw new RegraNegocioException("Não há vendas lançadas em " + dia.format(DIA_MES_ANO) + " para fechar");
        }

        BigDecimal total = vendas.stream()
                .map(Venda::getValor)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Configuracao config = configuracaoService.obterOuCriar(usuarioId);
        Valores valores = calcular(total, config);
        boolean dividir = Boolean.TRUE.equals(config.getDividirRetirada());

        // Os percentuais são copiados para o fechamento: mudar a configuração depois não altera o histórico
        FechamentoDiario novo = new FechamentoDiario();
        novo.setUsuario(usuarioRepository.getReferenceById(usuarioId));
        novo.setData(dia);
        novo.setTotalVendido(total);
        novo.setPercentualRetirada(config.getPercentualRetirada());
        novo.setValorRetirada(valores.retirada());
        novo.setPercentualSalario(dividir ? config.getPercentualSalario() : CEM);
        novo.setValorSalario(valores.salario());
        novo.setValorReserva(valores.reserva());
        novo.setFechadoEm(Relogio.agora());
        FechamentoDiario fechamento = fechamentoDiarioRepository.save(novo);

        for (Venda venda : vendas) {
            venda.setFechamentoDiario(fechamento);
        }
        vendaRepository.saveAll(vendas);

        // Entrada na reserva só existe se a divisão estiver ligada e a parte da reserva for maior que zero
        if (valores.reserva().signum() > 0) {
            MovimentoReserva entrada = new MovimentoReserva();
            entrada.setUsuario(fechamento.getUsuario());
            entrada.setFechamentoDiario(fechamento);
            entrada.setData(dia);
            entrada.setTipo(TipoMovimento.ENTRADA);
            entrada.setDescricao("Fechamento do dia " + dia.format(DIA_MES)
                    + " · " + formatarPercentual(config.getPercentualReserva()) + "% da retirada");
            entrada.setValor(valores.reserva());
            movimentoReservaRepository.save(entrada);
        }

        return FechamentoDiarioResponse.de(fechamento);
    }

    @Transactional(readOnly = true)
    public FechamentoDiarioResponse buscarPorData(Long usuarioId, LocalDate data) {
        return fechamentoDiarioRepository.findByUsuarioIdAndData(usuarioId, data)
                .map(FechamentoDiarioResponse::de)
                .orElseThrow(() -> new RecursoNaoEncontradoException(
                        "Não há fechamento em " + data.format(DIA_MES_ANO)));
    }

    // Retiradas por dia do mês (tela Pró-labore)
    @Transactional(readOnly = true)
    public List<FechamentoDiarioResponse> listarDoMes(Long usuarioId, YearMonth mes) {
        YearMonth alvo = (mes != null) ? mes : YearMonth.from(Relogio.hoje());
        return fechamentoDiarioRepository
                .findByUsuarioIdAndDataBetweenOrderByDataAsc(usuarioId, alvo.atDay(1), alvo.atEndOfMonth())
                .stream()
                .map(FechamentoDiarioResponse::de)
                .toList();
    }

    private Valores calcular(BigDecimal total, Configuracao config) {
        BigDecimal retirada = porcentagem(total, config.getPercentualRetirada());
        BigDecimal salario;
        BigDecimal reserva;

        if (Boolean.TRUE.equals(config.getDividirRetirada())) {
            salario = porcentagem(retirada, config.getPercentualSalario());
            // A reserva é o que sobra da retirada, para os centavos nunca se perderem
            reserva = retirada.subtract(salario);
        } else {
            salario = retirada;
            reserva = BigDecimal.ZERO.setScale(2);
        }

        return new Valores(retirada, salario, reserva, total.subtract(retirada));
    }

    private BigDecimal porcentagem(BigDecimal base, BigDecimal percentual) {
        return base.multiply(percentual).divide(CEM, 2, RoundingMode.HALF_UP);
    }

    // 50.00 vira "50"
    private String formatarPercentual(BigDecimal percentual) {
        return percentual.stripTrailingZeros().toPlainString();
    }

    private record Valores(BigDecimal retirada, BigDecimal salario, BigDecimal reserva, BigDecimal ficaNoCaixa) {
    }
}
