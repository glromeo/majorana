Feature: Lexer for Grassroots Expressions

  Scenario: Numbers

    Given the string '1'
    When  tokenized
    Then  I get 1 token of type Number
    And   token text is '1'

  Scenario Outline: Hex Numbers

    Given the string '<text>'
    When  tokenized
    Then  I get 1 token of type Number
    And   token int value is <value>

    Examples:

      | text               | value             |
      | 0x1                | 1                 |
      | 0xA                | 10                |
      | 0x10               | 16                |
      | 0x0123456789ABCDEF | 81985529216486900 |

  Scenario Outline: Binary Numbers

    Given the string '<text>'
    When  tokenized
    Then  I get 1 token of type Number
    And   token int value is <value>

    Examples:

      | text    | value |
      | 0b0     | 0     |
      | 0b1     | 1     |
      | 0b10    | 2     |
      | 0b1111  | 15    |
      | 0b10000 | 16    |

  Scenario Outline: Octal Numbers

    Given the string '<text>'
    When  tokenized
    Then  I get 1 token of type Number
    And   token int value is <value>

    Examples:

      | text | value |
      | 07   | 07    |
      | 010  | 010   |
      | 0777 | 0777  |
      | 01   | 1     |

  Scenario: Whitespaces then 1

    Given the string '  1'
    When  tokenized
    Then  I get 1 token of type Number
    And   token int value is 1

  Scenario: Two lines

    Given two lines '.' and '+'
    When  tokenized
    Then  I get 2 tokens
    And first token type is Symbol

  Scenario: Whitespaces and comments

    Given two lines '  /* comment */ 0 alpha // comment' and 'bravo'
    When  tokenized
    Then  I get 3 tokens
    And   1st token text is '0'
    And   2nd token text is 'alpha'
    And   3rd token text is 'bravo'

  Scenario Outline: Identifiers

    Given the string '<text>'
    When  tokenized
    Then  I get 1 token of type Literal
    And   token text is '<value>'

    Examples:

      | text      | value     |
      | _         | _         |
      | abc       | abc       |
      | _0A       | _0A       |
      | $x        | $x        |
      | this      | this      |
      | undefined | undefined |

  Scenario Outline: Symbols

    Given the string '<text>'
    When  tokenized
    Then  I get 1 token of type Symbol
    And   token text is '<value>'

    Examples:

      | text | value |
      | %    | %     |
      | +    | +     |
      | .    | .     |

  Scenario: Multiple Symbols

    Given the string '1 + 1'
    When  tokenized
    Then  I get 3 tokens
    And   2nd token type is Symbol
    And   token text is '+'

  Scenario: Multiple Symbols

    Given the string 'x++'
    When  tokenized
    Then  I get 3 tokens
    And   2nd token type is Symbol
    And   token text is '+'
    And   3rd token type is Symbol
    And   token text is '+'

  Scenario: Consume Symbols

    Given the string 'x++,y===z'
    When  I use a lexer
    Then  I consume one char code 'x'
    Then  I consume two char codes '++'
    Then  I consume one char code ','
    Then  I consume one char code 'y'
    Then  I consume three char codes '==='
    Then  I consume one char code 'z'
