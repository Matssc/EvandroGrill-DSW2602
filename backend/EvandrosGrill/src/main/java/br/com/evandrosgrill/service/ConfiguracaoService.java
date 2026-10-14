package br.com.evandrosgrill.service;

import br.com.evandrosgrill.exception.RegraNegocioException;
import br.com.evandrosgrill.model.entity.Configuracao;
import br.com.evandrosgrill.model.request.ConfiguracaoRequest;
import br.com.evandrosgrill.model.response.ConfiguracaoResponse;
import br.com.evandrosgrill.repository.ConfiguracaoRepository;
import br.com.evandrosgrill.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class ConfiguracaoService {

    private static final BigDecimal CEM = new BigDecimal("100");

    private final ConfiguracaoRepository configuracaoRepository;
    private final UsuarioRepository usuarioRepository;

    @Transactional
    public ConfiguracaoResponse buscar(Long usuarioId) {
        return ConfiguracaoResponse.de(obterOuCriar(usuarioId));
    }

    @Transactional
    public ConfiguracaoResponse atualizar(Long usuarioId, ConfiguracaoRequest request) {
        Configuracao config = obterOuCriar(usuarioId);

        BigDecimal percentualSalario;
        BigDecimal percentualReserva;

        if (Boolean.TRUE.equals(request.dividirRetirada())) {
            // Com a divisão ligada, salário + reserva precisam fechar 100% da retirada
            if (request.percentualSalario().add(request.percentualReserva()).compareTo(CEM) != 0) {
                throw new RegraNegocioException("O salário e a reserva precisam somar 100% da retirada");
            }
            percentualSalario = request.percentualSalario();
            percentualReserva = request.percentualReserva();
        } else {
            // Divisão desligada: toda a retirada vira salário
            percentualSalario = CEM;
            percentualReserva = BigDecimal.ZERO;
        }

        config.setPercentualRetirada(request.percentualRetirada());
        config.setDividirRetirada(request.dividirRetirada());
        config.setPercentualSalario(percentualSalario);
        config.setPercentualReserva(percentualReserva);
        config.setMetaReserva(request.metaReserva());

        return ConfiguracaoResponse.de(configuracaoRepository.save(config));
    }

    // Também usado por outros services (fechamento do dia, reserva).
    // Se o usuário ainda não tem configuração, cria a padrão: 30% de retirada, dividida 50/50.
    @Transactional
    public Configuracao obterOuCriar(Long usuarioId) {
        return configuracaoRepository.findByUsuarioId(usuarioId)
                .orElseGet(() -> criarPadrao(usuarioId));
    }

    private Configuracao criarPadrao(Long usuarioId) {
        Configuracao config = new Configuracao();
        config.setUsuario(usuarioRepository.getReferenceById(usuarioId));
        config.setPercentualRetirada(new BigDecimal("30.00"));
        config.setDividirRetirada(true);
        config.setPercentualSalario(new BigDecimal("50.00"));
        config.setPercentualReserva(new BigDecimal("50.00"));
        return configuracaoRepository.save(config);
    }
}
