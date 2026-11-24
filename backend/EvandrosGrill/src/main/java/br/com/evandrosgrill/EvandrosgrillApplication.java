package br.com.evandrosgrill;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

// Ponto de entrada do Spring Boot: sobe o servidor na porta 8080 e carrega todos os beans.
@SpringBootApplication
public class EvandrosgrillApplication {

	public static void main(String[] args) {
		SpringApplication.run(EvandrosgrillApplication.class, args);
	}

}
