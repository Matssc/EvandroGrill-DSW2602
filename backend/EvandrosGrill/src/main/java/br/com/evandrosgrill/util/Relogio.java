package br.com.evandrosgrill.util;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;

// Data e hora sempre no fuso de São Paulo, mesmo que o servidor esteja em outro fuso
public final class Relogio {

    private static final ZoneId ZONA = ZoneId.of("America/Sao_Paulo");

    private Relogio() {
    }

    // Data de hoje em São Paulo.
    public static LocalDate hoje() {
        return LocalDate.now(ZONA);
    }

    // Data e hora atuais em São Paulo.
    public static LocalDateTime agora() {
        return LocalDateTime.now(ZONA);
    }

    // Hora atual em São Paulo, sem os milissegundos.
    public static LocalTime horaAtual() {
        return LocalTime.now(ZONA).truncatedTo(ChronoUnit.SECONDS);
    }
}
