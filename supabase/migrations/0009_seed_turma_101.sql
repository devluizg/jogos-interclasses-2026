-- Cadastro em lote dos 32 estudantes da Turma 101
WITH turma_101 AS (
  SELECT id FROM public.turmas WHERE numero = 101 LIMIT 1
),
lista(nome_completo) AS (
  VALUES
    ('Alice Vitoria Sousa Santa Rosa'),
    ('Ana Beatriz Da Franca Mastop'),
    ('Ana Clara Da Conceicao Ferreira'),
    ('Ana Clara Farias Pereira'),
    ('Ana Gabriella Pereira Gomes'),
    ('Caua Fonseca Favacho'),
    ('Claudio Cezar Moura Da Conceicao'),
    ('Clewerton Santos Do Nascimento'),
    ('Davi Lopes De Azevedo'),
    ('David Gabriel Dias De Lima'),
    ('Elbe Kaue Oeiras Batista'),
    ('Emanoel De Oliveira Freitas'),
    ('Emanuelly Correa Araujo'),
    ('Fernanda Leal Do Nascimento'),
    ('Francisco Vinicius Barreto Oliveira'),
    ('Gabriel Nascimento De Souza'),
    ('Gloria Moura Goncalves'),
    ('Helciane Priscila Cardoso Paixao'),
    ('Isabela Mota De Araujo'),
    ('Izabely Miranda Barata'),
    ('Jamily Oliveira De Sousa'),
    ('Joao Miguel De Miranda Da Silva'),
    ('Jorge Augusto Monteiro De Barros Neto'),
    ('Kauane Vitoria Da Conceicao Maduro'),
    ('Luis Otavio Dos Santos Borges'),
    ('Maria Eduarda Dos Santos Ferreira'),
    ('Marlon Gabriel Chagas Nunes'),
    ('Matheus Vinycius Barbosa Trindade'),
    ('Miguel Inacio Soares Lima'),
    ('Nicole Do Carmo Maciel'),
    ('Pedro Emmanuel Da Cunha De Melo'),
    ('Ryan Barbosa Gomes')
)
INSERT INTO public.estudantes (turma_id, nome_completo)
SELECT t.id, l.nome_completo
FROM turma_101 t
CROSS JOIN lista l
WHERE NOT EXISTS (
  SELECT 1
  FROM public.estudantes e
  WHERE e.turma_id = t.id
    AND lower(trim(e.nome_completo)) = lower(trim(l.nome_completo))
);
