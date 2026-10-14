package br.com.evandrosgrill.service;

import br.com.evandrosgrill.exception.RecursoNaoEncontradoException;
import br.com.evandrosgrill.exception.RegraNegocioException;
import br.com.evandrosgrill.model.entity.Produto;
import br.com.evandrosgrill.model.entity.Venda;
import br.com.evandrosgrill.model.entity.VendaItem;
import br.com.evandrosgrill.model.enums.TipoLancamento;
import br.com.evandrosgrill.model.request.ItemVendaRequest;
import br.com.evandrosgrill.model.request.VendaRequest;
import br.com.evandrosgrill.model.response.MaisVendidoResponse;
import br.com.evandrosgrill.model.response.VendaResponse;
import br.com.evandrosgrill.model.response.VendasDoDiaResponse;
import br.com.evandrosgrill.repository.FechamentoDiarioRepository;
import br.com.evandrosgrill.repository.ProdutoRepository;
import br.com.evandrosgrill.repository.UsuarioRepository;
import br.com.evandrosgrill.repository.VendaItemRepository;
import br.com.evandrosgrill.repository.VendaRepository;
import br.com.evandrosgrill.util.Relogio;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class VendaService {

    private static final DateTimeFormatter DIA_MES_ANO = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final VendaRepository vendaRepository;
    private final FechamentoDiarioRepository fechamentoDiarioRepository;
    private final UsuarioRepository usuarioRepository;
    private final ProdutoRepository produtoRepository;
    private final VendaItemRepository vendaItemRepository;

    // Sem data, usa hoje. A última venda lançada aparece primeiro.
    @Transactional(readOnly = true)
    public List<VendaResponse> listarDoDia(Long usuarioId, LocalDate data) {
        LocalDate dia = (data != null) ? data : Relogio.hoje();
        return vendaRepository.findByUsuarioIdAndDataOrderByIdDesc(usuarioId, dia)
                .stream()
                .map(VendaResponse::de)
                .toList();
    }

    // Total, ticket médio e "Hoje por pagamento"
    @Transactional(readOnly = true)
    public VendasDoDiaResponse resumoDoDia(Long usuarioId, LocalDate data) {
        LocalDate dia = (data != null) ? data : Relogio.hoje();

        BigDecimal total = vendaRepository.somarPorData(usuarioId, dia);
        long quantidade = vendaRepository.countByUsuarioIdAndData(usuarioId, dia);
        BigDecimal ticketMedio = (quantidade == 0)
                ? BigDecimal.ZERO
                : total.divide(BigDecimal.valueOf(quantidade), 2, RoundingMode.HALF_UP);

        List<VendasDoDiaResponse.Pagamento> porPagamento = vendaRepository
                .totalPorFormaPagamento(usuarioId, dia)
                .stream()
                .map(p -> new VendasDoDiaResponse.Pagamento(
                        p.getFormaPagamento(), p.getQuantidade(), p.getTotal()))
                .toList();

        boolean diaFechado = fechamentoDiarioRepository.existsByUsuarioIdAndData(usuarioId, dia);

        return new VendasDoDiaResponse(dia, diaFechado, total, quantidade, ticketMedio, porPagamento);
    }

    // Produtos mais vendidos entre duas datas (sem datas, o dia de hoje)
    @Transactional(readOnly = true)
    public List<MaisVendidoResponse> maisVendidos(Long usuarioId, LocalDate inicio, LocalDate fim) {
        LocalDate de = (inicio != null) ? inicio : Relogio.hoje();
        LocalDate ate = (fim != null) ? fim : de;
        if (ate.isBefore(de)) {
            throw new RegraNegocioException("A data final não pode vir antes da inicial");
        }
        return vendaItemRepository.maisVendidos(usuarioId, de, ate)
                .stream()
                .map(p -> new MaisVendidoResponse(p.getProdutoId(), p.getNome(), p.getQuantidade(), p.getTotal()))
                .toList();
    }

    @Transactional
    public VendaResponse registrar(Long usuarioId, VendaRequest request) {
        LocalDate data = (request.data() != null) ? request.data() : Relogio.hoje();
        garantirDiaAberto(usuarioId, data);

        Venda venda = new Venda();
        venda.setUsuario(usuarioRepository.getReferenceById(usuarioId));
        preencher(usuarioId, venda, request, data);

        return VendaResponse.de(vendaRepository.save(venda));
    }

    @Transactional
    public VendaResponse atualizar(Long usuarioId, Long id, VendaRequest request) {
        Venda venda = buscarEntidade(usuarioId, id);
        garantirVendaEditavel(venda);

        LocalDate data = (request.data() != null) ? request.data() : venda.getData();
        garantirDiaAberto(usuarioId, data);

        preencher(usuarioId, venda, request, data);
        return VendaResponse.de(vendaRepository.save(venda));
    }

    @Transactional
    public void excluir(Long usuarioId, Long id) {
        Venda venda = buscarEntidade(usuarioId, id);
        garantirVendaEditavel(venda);
        vendaRepository.delete(venda);
    }

    private void preencher(Long usuarioId, Venda venda, VendaRequest request, LocalDate data) {
        venda.setData(data);
        venda.setTipoLancamento(request.tipoLancamento());
        venda.setOrigem(request.origem());
        venda.setFormaPagamento(request.formaPagamento());
        preencherItens(usuarioId, venda, request.itens());

        if (request.tipoLancamento() == TipoLancamento.POR_VENDA) {
            // "Por venda": o valor é a soma dos produtos, e a hora é a informada ou a atual
            if (venda.getItens().isEmpty()) {
                throw new RegraNegocioException("Escolha pelo menos um produto da venda");
            }
            venda.setValor(somaDosItens(venda));
            venda.setHora(request.hora() != null ? request.hora() : Relogio.horaAtual());
        } else {
            // "Total do dia": vale o total digitado (os itens só contam o que saiu) e não tem hora
            if (request.valor() == null) {
                throw new RegraNegocioException("Informe o total vendido no dia");
            }
            venda.setValor(request.valor());
            venda.setHora(null);
        }
    }

    // Troca os itens da venda pelos do pedido; produto repetido soma a quantidade.
    // Produto que já estava na venda mantém o preço da época; produto novo entra com o preço de hoje.
    private void preencherItens(Long usuarioId, Venda venda, List<ItemVendaRequest> pedidos) {
        Map<Long, BigDecimal> precoAnterior = new HashMap<>();
        for (VendaItem item : venda.getItens()) {
            precoAnterior.put(item.getProduto().getId(), item.getPrecoUnitario());
        }

        Map<Long, Integer> quantidades = new LinkedHashMap<>();
        if (pedidos != null) {
            for (ItemVendaRequest pedido : pedidos) {
                quantidades.merge(pedido.produtoId(), pedido.quantidade(), Integer::sum);
            }
        }

        venda.getItens().clear();
        for (Map.Entry<Long, Integer> entrada : quantidades.entrySet()) {
            Produto produto = produtoRepository.findByIdAndUsuarioId(entrada.getKey(), usuarioId)
                    .orElseThrow(() -> new RecursoNaoEncontradoException("Produto não encontrado"));
            VendaItem item = new VendaItem();
            item.setVenda(venda);
            item.setProduto(produto);
            item.setQuantidade(entrada.getValue());
            item.setPrecoUnitario(precoAnterior.getOrDefault(produto.getId(), produto.getPreco()));
            venda.getItens().add(item);
        }
    }

    private BigDecimal somaDosItens(Venda venda) {
        return venda.getItens().stream()
                .map(i -> i.getPrecoUnitario().multiply(BigDecimal.valueOf(i.getQuantidade())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    // Depois de fechado, o dia não recebe novas vendas
    private void garantirDiaAberto(Long usuarioId, LocalDate data) {
        if (fechamentoDiarioRepository.existsByUsuarioIdAndData(usuarioId, data)) {
            throw new RegraNegocioException(
                    "O dia " + data.format(DIA_MES_ANO) + " já foi fechado e não aceita vendas");
        }
    }

    // Venda ligada a um fechamento já entrou no cálculo da retirada, então fica travada
    private void garantirVendaEditavel(Venda venda) {
        if (venda.getFechamentoDiario() != null) {
            throw new RegraNegocioException("Esta venda pertence a um dia já fechado e não pode ser alterada");
        }
    }

    private Venda buscarEntidade(Long usuarioId, Long id) {
        return vendaRepository.findByIdAndUsuarioId(id, usuarioId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Venda não encontrada"));
    }
}
