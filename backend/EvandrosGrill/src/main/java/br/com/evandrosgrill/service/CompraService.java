package br.com.evandrosgrill.service;

import br.com.evandrosgrill.exception.RecursoNaoEncontradoException;
import br.com.evandrosgrill.exception.RegraNegocioException;
import br.com.evandrosgrill.model.entity.CartaoPj;
import br.com.evandrosgrill.model.entity.Categoria;
import br.com.evandrosgrill.model.entity.Compra;
import br.com.evandrosgrill.model.enums.FormaPagamentoCompra;
import br.com.evandrosgrill.model.enums.TipoCategoria;
import br.com.evandrosgrill.model.request.CompraRequest;
import br.com.evandrosgrill.model.response.CompraResponse;
import br.com.evandrosgrill.model.response.ComprasResumoResponse;
import br.com.evandrosgrill.repository.CartaoPjRepository;
import br.com.evandrosgrill.repository.CategoriaRepository;
import br.com.evandrosgrill.repository.CompraRepository;
import br.com.evandrosgrill.repository.UsuarioRepository;
import br.com.evandrosgrill.util.Relogio;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CompraService {

    private static final BigDecimal CEM = new BigDecimal("100");

    private final CompraRepository compraRepository;
    private final CategoriaRepository categoriaRepository;
    private final CartaoPjRepository cartaoPjRepository;
    private final UsuarioRepository usuarioRepository;

    // Tela Compras: mês (padrão = atual), filtro por cartão ou por forma de pagamento (abas) e busca por descrição.
    // Com busca, procura em todos os meses.
    @Transactional(readOnly = true)
    public List<CompraResponse> listar(Long usuarioId, YearMonth mes, Long cartaoPjId,
                                       FormaPagamentoCompra formaPagamento, String busca) {
        List<Compra> compras;

        if (busca != null && !busca.isBlank()) {
            compras = compraRepository
                    .findByUsuarioIdAndDescricaoContainingIgnoreCaseOrderByDataDescIdDesc(usuarioId, busca.trim());
        } else {
            YearMonth alvo = (mes != null) ? mes : YearMonth.from(Relogio.hoje());
            compras = compraRepository.findByUsuarioIdAndDataBetweenOrderByDataDescIdDesc(
                    usuarioId, alvo.atDay(1), alvo.atEndOfMonth());
        }

        return compras.stream()
                .filter(c -> cartaoPjId == null
                        || (c.getCartaoPj() != null && c.getCartaoPj().getId().equals(cartaoPjId)))
                .filter(c -> formaPagamento == null || c.getFormaPagamento() == formaPagamento)
                .map(CompraResponse::de)
                .toList();
    }

    @Transactional(readOnly = true)
    public CompraResponse buscar(Long usuarioId, Long id) {
        return CompraResponse.de(buscarEntidade(usuarioId, id));
    }

    @Transactional
    public CompraResponse criar(Long usuarioId, CompraRequest request) {
        Compra compra = new Compra();
        compra.setUsuario(usuarioRepository.getReferenceById(usuarioId));
        preencher(usuarioId, compra, request);
        return CompraResponse.de(compraRepository.save(compra));
    }

    @Transactional
    public CompraResponse atualizar(Long usuarioId, Long id, CompraRequest request) {
        Compra compra = buscarEntidade(usuarioId, id);
        preencher(usuarioId, compra, request);
        return CompraResponse.de(compraRepository.save(compra));
    }

    @Transactional
    public void excluir(Long usuarioId, Long id) {
        compraRepository.delete(buscarEntidade(usuarioId, id));
    }

    // Cards de topo, gasto por cartão, à vista e "Por categoria" do mês
    @Transactional(readOnly = true)
    public ComprasResumoResponse resumo(Long usuarioId, YearMonth mes) {
        YearMonth alvo = (mes != null) ? mes : YearMonth.from(Relogio.hoje());
        LocalDate inicio = alvo.atDay(1);
        LocalDate fim = alvo.atEndOfMonth();

        BigDecimal total = compraRepository.totalGeral(usuarioId, inicio, fim);
        long quantidade = compraRepository.countByUsuarioIdAndDataBetween(usuarioId, inicio, fim);

        List<ComprasResumoResponse.PorCartao> cartoes = compraRepository.totalPorCartao(usuarioId, inicio, fim)
                .stream()
                .map(c -> new ComprasResumoResponse.PorCartao(
                        c.getCartaoId(), c.getApelido(), c.getFinalCartao(),
                        c.getQuantidade(), c.getTotal(), percentual(c.getTotal(), total)))
                .toList();

        BigDecimal totalNoCartao = cartoes.stream()
                .map(ComprasResumoResponse.PorCartao::total)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalAVista = compraRepository.totalAVista(usuarioId, inicio, fim);
        long quantidadeAVista = compraRepository.countByUsuarioIdAndFormaPagamentoAndDataBetween(
                usuarioId, FormaPagamentoCompra.A_VISTA, inicio, fim);
        ComprasResumoResponse.AVista aVista = new ComprasResumoResponse.AVista(
                quantidadeAVista, totalAVista, percentual(totalAVista, total));

        List<ComprasResumoResponse.PorCategoria> categorias = compraRepository
                .totalPorCategoria(usuarioId, inicio, fim)
                .stream()
                .map(c -> new ComprasResumoResponse.PorCategoria(
                        c.getCategoriaId(), c.getNome(), c.getTotal(), percentual(c.getTotal(), total)))
                .toList();

        return new ComprasResumoResponse(total, quantidade, totalNoCartao, cartoes, aVista, categorias);
    }

    // Valida as regras entre campos e copia os dados do request para a compra
    private void preencher(Long usuarioId, Compra compra, CompraRequest request) {
        Categoria categoria = categoriaRepository.findByIdAndUsuarioId(request.categoriaId(), usuarioId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Categoria não encontrada"));
        if (categoria.getTipo() != TipoCategoria.COMPRA) {
            throw new RegraNegocioException("Escolha uma categoria do tipo COMPRA");
        }

        CartaoPj cartao = null;
        if (request.formaPagamento() == FormaPagamentoCompra.CARTAO) {
            if (request.cartaoPjId() == null) {
                throw new RegraNegocioException("Informe o cartão PJ usado na compra");
            }
            if (request.meioAVista() != null) {
                throw new RegraNegocioException("Compra no cartão não tem meio de pagamento à vista");
            }
            cartao = cartaoPjRepository.findByIdAndUsuarioId(request.cartaoPjId(), usuarioId)
                    .orElseThrow(() -> new RecursoNaoEncontradoException("Cartão não encontrado"));

            // Cartão desativado não recebe compras novas (a compra antiga pode continuar nele)
            boolean cartaoMudou = compra.getCartaoPj() == null
                    || !compra.getCartaoPj().getId().equals(cartao.getId());
            if (cartaoMudou && !Boolean.TRUE.equals(cartao.getAtivo())) {
                throw new RegraNegocioException("O cartão " + cartao.getApelido() + " está desativado");
            }
        } else if (request.cartaoPjId() != null) {
            throw new RegraNegocioException("Compra à vista não usa cartão PJ");
        }

        compra.setCategoria(categoria);
        compra.setCartaoPj(cartao);
        compra.setData(request.data());
        compra.setDescricao(request.descricao().trim());
        compra.setValor(request.valor());
        compra.setFormaPagamento(request.formaPagamento());
        compra.setMeioAVista(request.meioAVista());
    }

    // Parte do todo em %, com 1 casa decimal (0 se não houver compras)
    private BigDecimal percentual(BigDecimal parte, BigDecimal todo) {
        if (todo == null || todo.signum() == 0) {
            return BigDecimal.ZERO;
        }
        return parte.multiply(CEM).divide(todo, 1, RoundingMode.HALF_UP);
    }

    private Compra buscarEntidade(Long usuarioId, Long id) {
        return compraRepository.findByIdAndUsuarioId(id, usuarioId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Compra não encontrada"));
    }
}
