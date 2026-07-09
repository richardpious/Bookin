{ pkgs }: {
  deps = [
    pkgs.python311
    pkgs.python311Packages.pip
    pkgs.nodejs_22
    pkgs.jq
    pkgs.ripgrep
    pkgs.gnumake
    pkgs.gcc
    pkgs.flex
    pkgs.bison
    pkgs.curl
  ];
}
