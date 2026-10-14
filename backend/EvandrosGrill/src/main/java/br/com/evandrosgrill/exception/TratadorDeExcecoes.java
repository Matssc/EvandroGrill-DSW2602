package br.com.evandrosgrill.exception;

import br.com.evandrosgrill.model.response.ErroResponse;
import br.com.evandrosgrill.util.Relogio;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.util.List;

// Transforma as exceções dos services em respostas HTTP com o mesmo formato (ErroResponse)
@RestControllerAdvice
public class TratadorDeExcecoes {

    @ExceptionHandler(RecursoNaoEncontradoException.class)
    public ResponseEntity<ErroResponse> naoEncontrado(RecursoNaoEncontradoException e) {
        return responder(HttpStatus.NOT_FOUND, e.getMessage(), List.of());
    }

    @ExceptionHandler(RegraNegocioException.class)
    public ResponseEntity<ErroResponse> regraDeNegocio(RegraNegocioException e) {
        return responder(HttpStatus.BAD_REQUEST, e.getMessage(), List.of());
    }

    @ExceptionHandler(CredenciaisInvalidasException.class)
    public ResponseEntity<ErroResponse> credenciaisInvalidas(CredenciaisInvalidasException e) {
        return responder(HttpStatus.UNAUTHORIZED, e.getMessage(), List.of());
    }

    // Falhas do @Valid nos requests: uma linha por campo com problema
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErroResponse> dadosInvalidos(MethodArgumentNotValidException e) {
        List<String> detalhes = e.getBindingResult().getFieldErrors().stream()
                .map(erro -> erro.getField() + ": " + erro.getDefaultMessage())
                .toList();
        return responder(HttpStatus.BAD_REQUEST, "Dados inválidos", detalhes);
    }

    // JSON malformado ou valor que não existe no enum (ex.: tipo "XYZ")
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErroResponse> corpoInvalido(HttpMessageNotReadableException e) {
        return responder(HttpStatus.BAD_REQUEST,
                "Corpo da requisição inválido ou com valor não reconhecido", List.of());
    }

    // Parâmetro da URL com formato errado (data, mês, número ou enum)
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErroResponse> parametroInvalido(MethodArgumentTypeMismatchException e) {
        return responder(HttpStatus.BAD_REQUEST, "Valor inválido para o parâmetro '" + e.getName() + "'", List.of());
    }

    // Último recurso: o banco recusou (valor duplicado numa coluna única, por exemplo)
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErroResponse> conflitoNoBanco(DataIntegrityViolationException e) {
        return responder(HttpStatus.CONFLICT,
                "Não foi possível salvar: já existe um registro igual ou o dado está em uso", List.of());
    }

    private ResponseEntity<ErroResponse> responder(HttpStatus status, String mensagem, List<String> detalhes) {
        ErroResponse corpo = new ErroResponse(status.value(), mensagem, detalhes, Relogio.agora());
        return ResponseEntity.status(status).body(corpo);
    }
}
