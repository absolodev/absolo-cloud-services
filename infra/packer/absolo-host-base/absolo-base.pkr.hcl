packer {
  required_plugins {
    hcloud = {
      version = ">= 1.0.0"
      source  = "github.com/hashicorp/hcloud"
    }
  }
}

source "hcloud" "absolo_base" {
  image       = "ubuntu-24.04"
  location    = "fsn1"
  server_type = "cx22"
  ssh_username = "root"
}

build {
  sources = ["source.hcloud.absolo_base"]

  provisioner "shell" {
    inline = [
      "apt-get update",
      "apt-get upgrade -y",
      "apt-get install -y containerd runc iptables wireguard jq curl"
    ]
  }
}
