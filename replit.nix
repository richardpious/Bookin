{ pkgs }: {
  deps = [
    pkgs.python311
    pkgs.nodejs-18_x
    pkgs.jq
    pkgs.ripgrep
    pkgs.gnumake
    pkgs.gcc
    pkgs.flex
    pkgs.bison
    pkgs.curl
  ];
}
